import { Router, Request, Response } from 'express';
import { authenticateJWT, requireCompany } from '../../middleware/auth';
import { WhatsAppManager } from './whatsappManager';
import { processCustomerMessage } from '../../ai/botEngine';

const router = Router();
router.use(authenticateJWT);
router.use(requireCompany);

// Get WhatsApp connection status and current QR code
router.get('/status', (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const status = WhatsAppManager.getInstance().getSessionStatus(companyId);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve WhatsApp status' });
  }
});

// Initialize / Request QR Code for pairing
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    // Kick off initialization asynchronously
    WhatsAppManager.getInstance().initializeCompanySession(companyId).catch((err) => {
      console.error(`[WhatsApp] Init failed for company ${companyId}:`, err);
    });

    return res.json({ message: 'WhatsApp pairing initiated. Watch for QR code update.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to initiate WhatsApp pairing' });
  }
});

// Disconnect / Log out WhatsApp session
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    await WhatsAppManager.getInstance().disconnectCompanySession(companyId);
    return res.json({ message: 'WhatsApp session disconnected' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to disconnect WhatsApp session' });
  }
});

// Test bot conversation directly from the dashboard
router.post('/simulate-message', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { text, customerPhone } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const reply = await processCustomerMessage({
      companyId,
      customerPhone: customerPhone || '+1 (555) 999-0000',
      customerName: 'Dashboard Tester',
      incomingText: text,
    });

    return res.json({ incoming: text, reply });
  } catch (err: any) {
    console.error('Simulate message error:', err);
    return res.status(500).json({ error: err.message || 'Error processing test message' });
  }
});

export default router;
