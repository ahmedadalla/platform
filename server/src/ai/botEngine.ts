import { prisma } from '../prisma';
import { AIRouter } from './aiRouter';
import { getCompanyBotContext, buildSystemPrompt } from './promptBuilder';
import { AIToolDefinition, ChatMessage } from './types';
import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;
export function setBotEngineSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

const ORDER_TOOLS: AIToolDefinition[] = [
  {
    name: 'create_order',
    description: 'Call this function when the customer has clearly confirmed they want to place an order with specific items, delivery address, and name.',
    parameters: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          description: 'Name of the customer for the order',
        },
        deliveryAddress: {
          type: 'string',
          description: 'Delivery address where the order should be sent',
        },
        notes: {
          type: 'string',
          description: 'Any customer notes or special requests (e.g. no onions, extra napkins)',
        },
        items: {
          type: 'array',
          description: 'List of items to order matching the menu items',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the menu item' },
              quantity: { type: 'number', description: 'Quantity ordered' },
              price: { type: 'number', description: 'Unit price of the item from the menu' },
            },
            required: ['name', 'quantity', 'price'],
          },
        },
      },
      required: ['customerName', 'deliveryAddress', 'items'],
    },
  },
  {
    name: 'check_order_status',
    description: 'Check the status of a previous order placed by the customer',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: {
          type: 'number',
          description: 'The numeric order ID / number',
        },
      },
      required: ['orderNumber'],
    },
  },
];

export async function processCustomerMessage(params: {
  companyId: string;
  customerPhone: string;
  customerName?: string;
  incomingText: string;
}): Promise<string> {
  const { companyId, customerPhone, incomingText } = params;
  const isArabic = /[\u0600-\u06FF]/.test(incomingText);

  // 1. Fetch company and verify it is active
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company || !company.isActive) {
    return isArabic
      ? "عذراً، هذه الخدمة غير متاحة حالياً. يرجى التواصل مع المتجر مباشرة."
      : "This service is currently unavailable. Please contact the business directly.";
  }

  // 2. Fetch context (menu, documents, settings)
  const botContext = await getCompanyBotContext(companyId);
  if (!botContext) {
    return isArabic
      ? "عذراً، لا يمكن تحميل قائمة الطعام في الوقت الحالي."
      : "Sorry, we could not load our menu at this moment.";
  }

  const systemPrompt = buildSystemPrompt(botContext);

  // 3. Load conversation history
  let conversation = await prisma.conversation.findUnique({
    where: {
      companyId_customerPhone: {
        companyId,
        customerPhone,
      },
    },
  });

  let turns: ChatMessage[] = [];
  if (conversation && conversation.messages) {
    try {
      turns = JSON.parse(conversation.messages);
    } catch {
      turns = [];
    }
  }

  // Keep last 10 messages for context
  if (turns.length > 10) {
    turns = turns.slice(turns.length - 10);
  }

  turns.push({ role: 'user', content: incomingText });

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...turns,
  ];

  // 4. Call AI Provider
  const provider = AIRouter.getProvider(company);
  let replyText = '';

  try {
    const aiResponse = await provider.chat(fullMessages, ORDER_TOOLS);

    // 5. Handle Tool Calls (e.g. create_order)
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      for (const call of aiResponse.toolCalls) {
        if (call.name === 'create_order') {
          const { items, customerName, deliveryAddress, notes } = call.args;
          
          let subtotal = 0;
          const orderItemsData: { name: string; quantity: number; price: number; menuItemId?: string }[] = [];

          if (Array.isArray(items)) {
            for (const it of items) {
              const qty = Math.max(1, Math.round(it.quantity || 1));
              const unitPrice = parseFloat(it.price) || 0;
              subtotal += unitPrice * qty;

              const foundItem = await prisma.menuItem.findFirst({
                where: { companyId, name: { contains: it.name } },
              });

              orderItemsData.push({
                name: it.name,
                quantity: qty,
                price: unitPrice,
                menuItemId: foundItem?.id,
              });
            }
          }

          const deliveryFee = company.deliveryFee;
          const grandTotal = subtotal + deliveryFee;

          const lastOrder = await prisma.order.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' },
          });
          const nextOrderNum = (lastOrder?.orderNumber || 1000) + 1;

          const createdOrder = await prisma.order.create({
            data: {
              companyId,
              orderNumber: nextOrderNum,
              customerName: customerName || params.customerName || (isArabic ? 'عميل كريم' : 'Customer'),
              customerPhone,
              deliveryAddress: deliveryAddress || (isArabic ? 'العنوان قيد التحديد' : 'Address Not Specified'),
              notes: notes || '',
              subtotal,
              deliveryFee,
              total: grandTotal,
              status: 'PENDING',
              items: {
                create: orderItemsData.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  menuItemId: item.menuItemId,
                })),
              },
            },
            include: {
              items: true,
            },
          });

          if (ioInstance) {
            ioInstance.to(`company_${companyId}`).emit('order:created', createdOrder);
          }

          if (isArabic) {
            let receipt = `🎉 *تم استلام وتأكيد طلبك بنجاح! (#${nextOrderNum})*\n\n`;
            receipt += `👤 *العميل:* ${createdOrder.customerName}\n`;
            receipt += `📍 *عنوان التوصيل:* ${createdOrder.deliveryAddress}\n\n`;
            receipt += `*الطلبات:*\n`;
            for (const item of createdOrder.items) {
              receipt += `• ${item.quantity}x ${item.name} (${company.currency}${(item.price * item.quantity).toFixed(2)})\n`;
            }
            receipt += `\nالمجموع الفرعي: ${company.currency}${subtotal.toFixed(2)}`;
            receipt += `\nرسوم التوصيل: ${company.currency}${deliveryFee.toFixed(2)}`;
            receipt += `\n*الإجمالي المطلوب: ${company.currency}${grandTotal.toFixed(2)}*\n\n`;
            receipt += `⏳ الحالة: *في المطبخ / جار التحضير*\nشكراً لاختيارك ${company.name}! سيتواصل معك المندوب قريباً.`;

            replyText = (aiResponse.text ? `${aiResponse.text}\n\n` : '') + receipt;
          } else {
            let receipt = `🎉 *Order Confirmed! (#${nextOrderNum})*\n\n`;
            receipt += `👤 *Customer:* ${createdOrder.customerName}\n`;
            receipt += `📍 *Delivery To:* ${createdOrder.deliveryAddress}\n\n`;
            receipt += `*Items:*\n`;
            for (const item of createdOrder.items) {
              receipt += `• ${item.quantity}x ${item.name} (${company.currency}${(item.price * item.quantity).toFixed(2)})\n`;
            }
            receipt += `\nSubtotal: ${company.currency}${subtotal.toFixed(2)}`;
            receipt += `\nDelivery Fee: ${company.currency}${deliveryFee.toFixed(2)}`;
            receipt += `\n*Total: ${company.currency}${grandTotal.toFixed(2)}*\n\n`;
            receipt += `⏳ Status: *In Kitchen / Received*\nWe are preparing your order now. Thank you for ordering with ${company.name}!`;

            replyText = (aiResponse.text ? `${aiResponse.text}\n\n` : '') + receipt;
          }
        } else if (call.name === 'check_order_status') {
          const { orderNumber } = call.args;
          const foundOrder = await prisma.order.findFirst({
            where: {
              companyId,
              orderNumber: parseInt(orderNumber, 10),
            },
          });

          if (foundOrder) {
            const statusLabelsAr: Record<string, string> = {
              PENDING: '🟡 بانتظار التأكيد',
              IN_KITCHEN: '🍳 جاري التحضير في المطبخ',
              OUT_FOR_DELIVERY: '🛵 مع المندوب في الطريق',
              DELIVERED: '✅ تم التسليم بنجاح',
              CANCELLED: '❌ ملغي',
            };
            const statusLabelsEn: Record<string, string> = {
              PENDING: '🟡 Pending Confirmation',
              IN_KITCHEN: '🍳 Cooking in Kitchen',
              OUT_FOR_DELIVERY: '🛵 Out for Delivery',
              DELIVERED: '✅ Delivered',
              CANCELLED: '❌ Cancelled',
            };
            replyText = isArabic
              ? `حالة الطلب رقم #${foundOrder.orderNumber}: *${statusLabelsAr[foundOrder.status] || foundOrder.status}*.`
              : `Status of Order #${foundOrder.orderNumber}: *${statusLabelsEn[foundOrder.status] || foundOrder.status}*.`;
          } else {
            replyText = isArabic
              ? `لم نتمكن من العثور على طلب بالرقم #${orderNumber}. يرجى التأكد من الرقم.`
              : `We could not find an order with number #${orderNumber}. Please check the number and try again.`;
          }
        }
      }
    } else {
      replyText = aiResponse.text || (
        isArabic
          ? `أهلاً بك في ${company.name}! كيف يمكنني خدمتك اليوم؟ يمكنك طلب الاطلاع على المنيو أو إرسال طلبك مباشرة.`
          : `I'm here to help! Let me know if you would like to see the menu or place an order.`
      );
    }
  } catch (err: any) {
    console.error('[BotEngine] Error in conversation processing:', err);

    // Smart graceful fallback answering common requests even on API hiccups
    const lower = incomingText.toLowerCase();
    const isAskingMenu = lower.includes('menu') || lower.includes('minue') || lower.includes('منيو') || lower.includes('قائمة');
    const isGreeting = lower.includes('سلام') || lower.includes('مرحبا') || lower.includes('أهلا') || lower.includes('hi') || lower.includes('hello');

    if (isAskingMenu && botContext.categories.length > 0) {
      if (isArabic) {
        let menuTxt = `📋 *قائمة الطعام والأسعار - ${company.name}*\n\n`;
        for (const cat of botContext.categories) {
          menuTxt += `*${cat.name}:*\n`;
          for (const it of cat.items) {
            menuTxt += `• ${it.name} - ${company.currency}${it.price.toFixed(2)}${it.description ? ` (${it.description})` : ''}\n`;
          }
          menuTxt += '\n';
        }
        menuTxt += `🛵 رسوم التوصيل: ${company.currency}${company.deliveryFee.toFixed(2)}\n`;
        menuTxt += `للطلب، يرجى كتابة الوجبة المطلوبة والكمية وعنوان التوصيل!`;
        replyText = menuTxt;
      } else {
        let menuTxt = `📋 *Menu & Pricing - ${company.name}*\n\n`;
        for (const cat of botContext.categories) {
          menuTxt += `*${cat.name}:*\n`;
          for (const it of cat.items) {
            menuTxt += `• ${it.name} - ${company.currency}${it.price.toFixed(2)}${it.description ? ` (${it.description})` : ''}\n`;
          }
          menuTxt += '\n';
        }
        menuTxt += `🛵 Delivery Fee: ${company.currency}${company.deliveryFee.toFixed(2)}\n`;
        menuTxt += `To order, simply reply with the items you want and your delivery address!`;
        replyText = menuTxt;
      }
    } else if (isGreeting) {
      replyText = isArabic
        ? `وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك في ${company.name} 🌹\nيسعدنا خدمتك اليوم. هل تود استعراض المنيو أو تقديم طلب جديد؟`
        : `Hello! Welcome to ${company.name} 👋 How can I help you today? Would you like to view our menu or place an order?`;
    } else {
      replyText = isArabic
        ? `أهلاً بك في ${company.name}! تم استلام رسالتك. يمكنك كتابة "المنيو" لرؤية قائمة الوجبات أو إرسال طلبك وعنوانك وسنقوم بتجهيزه لك فوراً!`
        : `Welcome to ${company.name}! We received your message. You can type "menu" to see our items, or send your order items and delivery address!`;
    }
  }

  // 6. Save updated conversation turns
  turns.push({ role: 'assistant', content: replyText });
  await prisma.conversation.upsert({
    where: {
      companyId_customerPhone: {
        companyId,
        customerPhone,
      },
    },
    update: {
      messages: JSON.stringify(turns),
      updatedAt: new Date(),
    },
    create: {
      companyId,
      customerPhone,
      messages: JSON.stringify(turns),
    },
  });

  if (ioInstance) {
    ioInstance.to(`company_${companyId}`).emit('chat:message', {
      customerPhone,
      incomingText,
      replyText,
      timestamp: new Date(),
    });
  }

  return replyText;
}
