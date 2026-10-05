import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';

import authRoutes from './modules/auth/authRoutes';
import superAdminRoutes from './modules/superadmin/superAdminRoutes';
import companyRoutes from './modules/company/companyRoutes';
import menuRoutes from './modules/menu/menuRoutes';
import knowledgeRoutes from './modules/knowledge/knowledgeRoutes';
import ordersRoutes, { setOrdersSocketIO } from './modules/orders/ordersRoutes';
import whatsappRoutes from './modules/whatsapp/whatsappRoutes';
import conversationRoutes from './modules/conversations/conversationRoutes';

import { WhatsAppManager } from './modules/whatsapp/whatsappManager';
import { setBotEngineSocketIO } from './ai/botEngine';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Configure Socket.IO in managers
WhatsAppManager.getInstance().setSocketIO(io);
setBotEngineSocketIO(io);
setOrdersSocketIO(io);

// Socket.IO Room Joining for Tenant Isolation
io.on('connection', (socket) => {
  socket.on('join:company', (companyId: string) => {
    if (companyId) {
      socket.join(`company_${companyId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined room company_${companyId}`);
    }
  });

  socket.on('disconnect', () => {});
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads
app.use('/uploads', express.static(config.uploadsDir));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'B2B AI WhatsApp Platform API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/conversations', conversationRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred',
  });
});

server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 ChatPilot B2B Platform Server listening on port ${config.port}`);
  console.log(`🔗 API Base: http://localhost:${config.port}/api`);
  console.log(`=======================================================`);
});
