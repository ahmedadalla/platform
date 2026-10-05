import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { config } from '../../config';
import { processCustomerMessage } from '../../ai/botEngine';
import { Server as SocketIOServer } from 'socket.io';

export type WhatsAppSessionStatus = 'DISCONNECTED' | 'QR_READY' | 'CONNECTING' | 'CONNECTED';

interface SessionState {
  companyId: string;
  socket?: WASocket;
  status: WhatsAppSessionStatus;
  qrCodeDataUrl?: string | null;
  phoneNumber?: string | null;
}

export class WhatsAppManager {
  private static instance: WhatsAppManager;
  private sessions: Map<string, SessionState> = new Map();
  private io?: SocketIOServer;

  private constructor() {
    if (!fs.existsSync(config.sessionsDir)) {
      fs.mkdirSync(config.sessionsDir, { recursive: true });
    }
  }

  public static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) {
      WhatsAppManager.instance = new WhatsAppManager();
    }
    return WhatsAppManager.instance;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public getSessionStatus(companyId: string): {
    status: WhatsAppSessionStatus;
    qrCodeDataUrl?: string | null;
    phoneNumber?: string | null;
  } {
    const session = this.sessions.get(companyId);
    if (!session) {
      return { status: 'DISCONNECTED' };
    }
    return {
      status: session.status,
      qrCodeDataUrl: session.qrCodeDataUrl,
      phoneNumber: session.phoneNumber,
    };
  }

  public async initializeCompanySession(companyId: string): Promise<SessionState> {
    // If already connected, return existing session
    const existing = this.sessions.get(companyId);
    if (existing && existing.status === 'CONNECTED' && existing.socket) {
      return existing;
    }

    const sessionDir = path.join(config.sessionsDir, `company_${companyId}`);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    const sessionState: SessionState = {
      companyId,
      status: 'CONNECTING',
      qrCodeDataUrl: null,
    };
    this.sessions.set(companyId, sessionState);
    this.emitStatus(companyId);

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['ChatPilot B2B Platform', 'Chrome', '1.0.0'],
    });

    sessionState.socket = sock;

    // Credentials update handler
    sock.ev.on('creds.update', saveCreds);

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          sessionState.status = 'QR_READY';
          sessionState.qrCodeDataUrl = qrDataUrl;
          this.emitStatus(companyId);
          console.log(`[WhatsAppManager] Company ${companyId} QR generated.`);
        } catch (err) {
          console.error('[WhatsAppManager] Error converting QR code:', err);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0].replace('@s.whatsapp.net', '');
        sessionState.status = 'CONNECTED';
        sessionState.qrCodeDataUrl = null;
        sessionState.phoneNumber = phone;
        this.emitStatus(companyId);
        console.log(`[WhatsAppManager] Company ${companyId} WhatsApp Connected successfully! Phone: ${phone}`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsAppManager] Company ${companyId} connection closed. Reason: ${statusCode}, Reconnect: ${shouldReconnect}`);

        sessionState.status = 'DISCONNECTED';
        sessionState.qrCodeDataUrl = null;
        this.emitStatus(companyId);

        if (shouldReconnect) {
          // Reconnect with a slight delay
          setTimeout(() => {
            this.initializeCompanySession(companyId).catch(err => {
              console.error(`[WhatsAppManager] Auto-reconnect failed for ${companyId}:`, err);
            });
          }, 4000);
        } else {
          // Clean up session directory if logged out
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (e) {}
        }
      }
    });

    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        // Skip messages from the bot itself or broadcast groups
        if (msg.key.fromMe || !msg.message) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('broadcast')) continue;

        // Handle both @s.whatsapp.net and @lid JID formats
        // Store the full remoteJid for replies, and extract a clean phone for DB/display
        const customerPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
        const pushName = msg.pushName || 'Customer';

        // Extract message text
        let incomingText = '';
        if (msg.message.conversation) {
          incomingText = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
          incomingText = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage?.caption) {
          incomingText = msg.message.imageMessage.caption;
        }

        if (!incomingText || !incomingText.trim()) continue;

        console.log(`[WhatsApp] Received from ${customerPhone} (JID: ${remoteJid}, Company: ${companyId}): "${incomingText}"`);

        // Send 'typing' presence indicator
        await sock.sendPresenceUpdate('composing', remoteJid);

        try {
          const replyText = await processCustomerMessage({
            companyId,
            customerPhone,
            customerName: pushName,
            incomingText: incomingText.trim(),
          });

          // Reply using the ORIGINAL remoteJid (preserves @lid or @s.whatsapp.net)
          await sock.sendMessage(remoteJid, { text: replyText });
          await sock.sendPresenceUpdate('available', remoteJid);
        } catch (err: any) {
          console.error(`[WhatsApp] Error handling message for company ${companyId}:`, err);
          await sock.sendMessage(remoteJid, {
            text: "Hello! We received your message and our team will get back to you shortly.",
          });
        }
      }
    });

    return sessionState;
  }

  public async disconnectCompanySession(companyId: string): Promise<void> {
    const session = this.sessions.get(companyId);
    if (session && session.socket) {
      try {
        await session.socket.logout();
      } catch (err) {}
      session.status = 'DISCONNECTED';
      session.qrCodeDataUrl = null;
      session.phoneNumber = null;
      this.emitStatus(companyId);
    }
  }

  public async sendOrderNotification(params: {
    companyId: string;
    customerPhone: string;
    orderNumber: number;
    status: string;
    customMessage?: string;
  }): Promise<boolean> {
    const { companyId, customerPhone, orderNumber, status, customMessage } = params;
    const session = this.sessions.get(companyId);
    if (!session || session.status !== 'CONNECTED' || !session.socket) {
      console.warn(`[WhatsAppManager] Cannot send notification for Order #${orderNumber}: WhatsApp session is ${session?.status || 'DISCONNECTED'}`);
      return false;
    }

    // Clean phone number: strip @lid, @s.whatsapp.net suffixes and non-digits
    let cleanPhone = customerPhone.replace('@lid', '').replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.slice(2);
    }

    if (!cleanPhone) {
      console.warn(`[WhatsAppManager] Invalid customer phone: "${customerPhone}"`);
      return false;
    }

    // Fetch company name
    let companyName = 'المتجر';
    try {
      const { prisma } = require('../../prisma');
      const comp = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      if (comp?.name) companyName = comp.name;
    } catch {}

    const statusMessages: Record<string, string> = {
      IN_KITCHEN: `🍳 *تحديث للطلب #${orderNumber} (${companyName})*\nطلبك الآن قيد التحضير في المطبخ طازجاً! ✨\n\nYour order is now being prepared fresh in our kitchen!`,
      OUT_FOR_DELIVERY: `🛵 *طلبك في الطريق إليك! (طلب رقم #${orderNumber} - ${companyName})*\n\nأهلاً بك! تم تسليم طلبك لمندوب التوصيل وهو في الطريق إلى عنوانك الآن! 🚀\nيرجى التكرم بالاستعداد لاستلام الطلب. شكراً لطلبك من ${companyName}! 🌹\n\n---\n*Order #${orderNumber} Update:*\nYour food is on its way with our delivery courier! Please be ready to receive it.`,
      DELIVERED: `✅ *تم تسليم الطلب #${orderNumber} (${companyName})*\n\nتم تسليم طلبك بنجاح! بالعافية وشكراً لتعاملك معنا. نتشرف دائماً بخدمتك. 🌹\n\nYour order has been delivered! Enjoy your meal, and thank you for ordering with us.`,
      CANCELLED: `❌ *إشعار بإلغاء الطلب #${orderNumber} (${companyName})*\n\nنأسف لإبلاغك بأنه تم إلغاء طلبك. إذا كان لديك أي استفسار يرجى مراسلتنا هنا وسنقوم بمساعدتك فوراً.`,
    };

    const text = customMessage || statusMessages[status];
    if (!text) {
      console.warn(`[WhatsAppManager] No message template for status: ${status}`);
      return false;
    }

    // Build candidate JIDs to try — LID first (WhatsApp's new Linked Device ID format), then standard
    const jidsToTry: string[] = [];

    // Check if the original phone from the order already looks like a LID number (very long, typically 15+ digits)
    // LID numbers are NOT real phone numbers — they are internal WhatsApp identifiers for linked devices
    const isLikelyLID = cleanPhone.length >= 15;

    if (isLikelyLID) {
      // Try LID format first, then standard
      jidsToTry.push(`${cleanPhone}@lid`);
      jidsToTry.push(`${cleanPhone}@s.whatsapp.net`);
    } else {
      // Standard phone number — try @s.whatsapp.net first, then @lid
      jidsToTry.push(`${cleanPhone}@s.whatsapp.net`);
      jidsToTry.push(`${cleanPhone}@lid`);
    }

    console.log(`[WhatsAppManager] Sending status update [${status}] for order #${orderNumber} to phone "${cleanPhone}". Trying JIDs: ${jidsToTry.join(', ')}`);

    for (const jid of jidsToTry) {
      try {
        await session.socket.sendMessage(jid, { text });
        console.log(`[WhatsAppManager] ✅ Successfully sent [${status}] update via ${jid}`);

        // Record in Conversation history so it appears in the chat transcript
        try {
          const { prisma } = require('../../prisma');
          // Try to find conversation with the clean phone (without @lid suffix)
          let conv = await prisma.conversation.findUnique({
            where: {
              companyId_customerPhone: {
                companyId,
                customerPhone: cleanPhone,
              },
            },
          });

          let turns: any[] = [];
          if (conv?.messages) {
            try { turns = JSON.parse(conv.messages); } catch {}
          }
          turns.push({
            role: 'assistant',
            content: text,
          });

          await prisma.conversation.upsert({
            where: {
              companyId_customerPhone: {
                companyId,
                customerPhone: cleanPhone,
              },
            },
            update: {
              messages: JSON.stringify(turns),
              updatedAt: new Date(),
            },
            create: {
              companyId,
              customerPhone: cleanPhone,
              messages: JSON.stringify(turns),
            },
          });

          if (this.io) {
            this.io.to(`company_${companyId}`).emit('chat:message', {
              customerPhone: cleanPhone,
              incomingText: `[تحديث حالة الطلب #${orderNumber}: ${status}]`,
              replyText: text,
              timestamp: new Date(),
            });
          }
        } catch (dbErr) {
          console.error('[WhatsAppManager] Failed to record notification in conversation DB:', dbErr);
        }

        return true;
      } catch (err: any) {
        console.warn(`[WhatsAppManager] Failed to send via ${jid}: ${err.message}`);
        // Continue to next JID candidate
      }
    }

    console.error(`[WhatsAppManager] ❌ All JID attempts failed for order #${orderNumber}, phone: ${cleanPhone}`);
    return false;
  }

  private emitStatus(companyId: string) {
    if (this.io) {
      const session = this.sessions.get(companyId);
      this.io.to(`company_${companyId}`).emit('whatsapp:status', {
        status: session?.status || 'DISCONNECTED',
        qrCodeDataUrl: session?.qrCodeDataUrl,
        phoneNumber: session?.phoneNumber,
      });
    }
  }
}
