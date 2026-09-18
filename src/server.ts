// src/server.ts - Updated version
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { env } from './config/env';
import { initDatabase, disconnectDatabase } from './config/database';
import authRoutes from './auth/auth.routes';
import profileRoutes from './profiles/profile.routes';
import interestsRoutes from './interests/interests.routes';
import verificationRoutes from './verification/verification.routes';
import settingsRoutes from './settings/settings.routes';
import postsRoutes from './posts/posts.routes';
import likesRoutes from './likes/likes.routes';
import commentsRoutes from './comments/comments.routes';
import followRoutes from './follow/follow.routes';
import searchRoutes from './search/search.routes';
import uploadRoutes from './upload/upload.routes';
import groupsRoutes from './groups/groups.routes';   // ← ADD THIS
import eventsRoutes from './events/events.routes';
import chatRoutes from './chat/chat.routes';
import { errorHandler } from './middleware/errorHandler';
import { ChatSocket } from './chat/socket';
import path from 'path';

const app = express();
const httpServer = createServer(app);

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Health Check
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    app: 'SakhiSphere Backend API',
    version: '1.0.0',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'PostgreSQL',
    websocket: 'active',
  });
});

// Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interests', interestsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', likesRoutes);
app.use('/api', commentsRoutes);
app.use('/api', followRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupsRoutes);   // ← ADD THIS
app.use('/api/events', eventsRoutes);


// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// Initialize Socket.IO
const chatSocket = new ChatSocket(httpServer);

// Start server
async function startServer() {
  try {
    initDatabase();
    
    httpServer.listen(env.port, () => {
      console.log('🌸 SakhiSphere API Server');
      console.log(`   Port: ${env.port}`);
      console.log(`   Database: PostgreSQL`);
      console.log(`   WebSocket: Active`);
      console.log(`   URL: http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

startServer();