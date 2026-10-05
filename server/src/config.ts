import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'b2b-whatsapp-super-secret-jwt-key-2026',
  systemDefaultAI: {
    provider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    openrouterKey: process.env.OPENROUTER_API_KEY || '',
    customBaseUrl: process.env.AI_CUSTOM_BASE_URL || '',
  },
  uploadsDir: path.join(__dirname, '..', 'uploads'),
  sessionsDir: path.join(__dirname, '..', 'data', 'sessions'),
};
