import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { authenticateJWT, requireCompany } from '../../middleware/auth';
import { WhatsAppManager } from '../whatsapp/whatsappManager';
import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;
export function setOrdersSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

const router = Router();
router.use(authenticateJWT);
router.use(requireCompany);

// List orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { status } = req.query;

    const where: any = { companyId };
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    return res.json(orders);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (Kitchen / Delivery tracking)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;
    const { status, notifyCustomer } = req.body;

    const validStatuses = ['PENDING', 'IN_KITCHEN', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await prisma.order.findFirst({
      where: { id: id as string, companyId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: id as string },
      data: { status },
      include: { items: true },
    });

    // 1. Emit live WebSocket update to all open Kitchen & Delivery dashboards
    if (ioInstance) {
      ioInstance.to(`company_${companyId}`).emit('order:status_changed', updated);
    }

    // 2. WhatsApp Customer Notification
    // OUT_FOR_DELIVERY always triggers an automatic notification (mandatory UX rule).
    // Other statuses respect the optional notifyCustomer toggle sent from the dashboard.
    let whatsappNotified = false;
    const shouldAlwaysNotify = status === 'OUT_FOR_DELIVERY';

    if (order.customerPhone && (shouldAlwaysNotify || notifyCustomer !== false)) {
      console.log(`[Orders] Auto-sending WhatsApp update [${status}] to ${order.customerPhone} for Order #${order.orderNumber}`);
      whatsappNotified = await WhatsAppManager.getInstance().sendOrderNotification({
        companyId,
        customerPhone: order.customerPhone,
        orderNumber: order.orderNumber,
        status,
      });
      console.log(`[Orders] WhatsApp notification sent: ${whatsappNotified}`);
    }

    return res.json({
      message: `Order status updated to ${status}`,
      order: updated,
      whatsappNotified,
      autoNotified: shouldAlwaysNotify,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Simulate Order placement (useful for testing kitchen board without a physical phone)
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { items: { take: 2 } },
    });

    if (!company) return res.status(404).json({ error: 'Company not found' });

    const lastOrder = await prisma.order.findFirst({
      where: { companyId },
      orderBy: { orderNumber: 'desc' },
    });
    const nextOrderNum = (lastOrder?.orderNumber || 1000) + 1;

    const sampleItems: Array<{ name: string; price: number }> = company.items.length > 0
      ? company.items.map(it => ({ name: it.name, price: it.price }))
      : [
          { name: 'Special Burger Combo', price: 14.50 },
          { name: 'Iced Lemon Tea', price: 3.50 },
        ];

    const subtotal: number = sampleItems.reduce((acc: number, it: { name: string; price: number }) => acc + it.price, 0);
    const total: number = subtotal + company.deliveryFee;

    const created = await prisma.order.create({
      data: {
        companyId,
        orderNumber: nextOrderNum,
        customerName: req.body.customerName || 'Test Customer',
        customerPhone: req.body.customerPhone || '+1 (555) 019-2834',
        deliveryAddress: req.body.deliveryAddress || '101 Silicon Ave, Floor 3',
        notes: req.body.notes || 'Please handle with care',
        subtotal,
        deliveryFee: company.deliveryFee,
        total,
        status: 'PENDING',
        items: {
          create: sampleItems.map(it => ({
            name: it.name,
            price: it.price,
            quantity: 1,
          })),
        },
      },
      include: { items: true },
    });

    if (ioInstance) {
      ioInstance.to(`company_${companyId}`).emit('order:created', created);
    }

    return res.status(201).json({ message: 'Simulated order created', order: created });
  } catch (err: any) {
    console.error('Simulate order error:', err);
    return res.status(500).json({ error: 'Failed to simulate order' });
  }
});

export default router;
