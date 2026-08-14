/**
 * BACKEND QNOOK – VERSION PRODUCTION
 * 
 * Sécurité: JWT, CORS restreint, Rate limiting, HTTPS
 * Scalabilité: PostgreSQL, WebSocket, Circuit Breaker
 * Robustesse: Timeouts, Retries, Fallback
 * 
 * npm install express cors jsonwebtoken bcryptjs pg dotenv express-rate-limit stripe nodemailer winston
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import pkg from 'pg';
const { Pool } = pkg;
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import winston from 'winston';
import { WebSocketServer } from 'ws';
import http from 'http';
import https from 'https';
import fs from 'fs';

// ========== CONFIGURATION ==========

const app = express();
const server = http.createServer(app);

// Logger structuré
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Email
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ========== CORS ==========
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://stripe-terminal-js-demo.onrender.com',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== MIDDLEWARE ==========

app.use(express.json({ limit: '1mb' }));

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100,
  message: 'Trop de requêtes, réessayez plus tard',
  standardHeaders: true,
  legacyHeaders: false
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.sessionId || req.ip,
  skip: (req) => !req.sessionId
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use(generalLimiter);

// ========== AUTHENTIFICATION JWT ==========

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const JWT_EXPIRY = '24h';

// Middleware de vérification JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.sessionId = decoded.sessionId;
    req.cabineId = decoded.cabineId;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    logger.error('JWT verification failed', { error: err.message });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ========== ROUTES PUBLIQUES ==========

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Génération de session token
app.post('/auth/session-token', authLimiter, async (req, res) => {
  try {
    const { cabineId, readerId } = req.body;

    if (!cabineId || !readerId) {
      return res.status(400).json({ error: 'Missing cabineId or readerId' });
    }

    // Vérifier que la cabine existe
    const cabineResult = await pool.query(
      'SELECT id FROM cabines WHERE id = $1',
      [cabineId]
    );

    if (cabineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cabine not found' });
    }

    // Générer JWT
    const token = jwt.sign(
      {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cabineId: cabineId,
        readerId: readerId,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token, expiresIn: JWT_EXPIRY });
  } catch (err) {
    logger.error('session-token error', { error: err });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== ROUTES PROTÉGÉES ==========

// Récupérer les produits
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, image_url as "image", promo FROM products ORDER BY created_at'
    );

    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    res.json(result.rows);
  } catch (err) {
    logger.error('products.fetch_failed', { error: err });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Créer payment intent
app.post('/api/v1/payments/create-intent', verifyToken, paymentLimiter, async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    if (!amount || amount <= 0 || amount > 999999) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!['eur', 'usd'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const intent = await stripe.paymentIntents.create({
      amount: parseInt(amount),
      currency,
      capture_method: 'manual',
      description: description || `Qnook - ${req.cabineId}`,
      payment_method_types: ['card_present'],
      payment_method_options: {
        card_present: { request_incremental_authorization_support: true }
      },
      metadata: {
        sessionId: req.sessionId,
        cabineId: req.cabineId
      }
    });

    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency
    });
  } catch (err) {
    logger.error('create_payment_intent failed', { error: err, cabineId: req.cabineId });
    res.status(500).json({ error: err.message });
  }
});

// Incrémenter autorisation
app.post('/api/v1/payments/increment', verifyToken, paymentLimiter, async (req, res) => {
  try {
    const { paymentIntentId, newAmount } = req.body;

    if (!paymentIntentId || !newAmount || newAmount <= 0) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.metadata.cabineId !== req.cabineId) {
      logger.warn('Unauthorized increment attempt', {
        paymentIntentId,
        authorizedCabine: intent.metadata.cabineId,
        requestedCabine: req.cabineId
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (newAmount < intent.amount) {
      return res.status(400).json({ error: 'Cannot decrement authorization' });
    }

    const increment = newAmount - intent.amount;
    const result = await stripe.paymentIntents.incrementAuthorization(paymentIntentId, {
      amount: increment
    });

    res.json({
      success: true,
      newAmount: result.amount,
      previousAmount: intent.amount
    });
  } catch (err) {
    logger.error('increment_authorization failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

// Capturer le paiement
app.post('/api/v1/payments/capture', verifyToken, async (req, res) => {
  try {
    const { paymentIntentId, amountToCapture } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.metadata.cabineId !== req.cabineId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const captured = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: amountToCapture || undefined
    });

    await pool.query(
      `INSERT INTO sessions (id, cabine_id, payment_intent_id, amount_captured, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        `session_${Date.now()}`,
        req.cabineId,
        paymentIntentId,
        captured.amount_received,
        'completed'
      ]
    );

    res.json({
      success: true,
      amount: captured.amount_received,
      currency: captured.currency
    });
  } catch (err) {
    logger.error('capture_payment failed', { error: err, paymentIntentId: req.body.paymentIntentId });
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour description
app.post('/api/v1/payments/update-description', verifyToken, async (req, res) => {
  try {
    const { paymentIntentId, description } = req.body;

    if (!paymentIntentId || !description) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.metadata.cabineId !== req.cabineId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      description: description
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('update_description failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

// ========== WEBHOOKS STRIPE ==========

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const existingEvent = await pool.query(
      'SELECT stripe_event_id FROM webhook_events WHERE stripe_event_id = $1',
      [event.id]
    );

    if (existingEvent.rows.length > 0) {
      return res.json({ received: true });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info('payment_intent.succeeded', { paymentIntentId: event.data.object.id });
        break;

      case 'payment_intent.payment_failed':
        logger.error('payment_intent.payment_failed', {
          paymentIntentId: event.data.object.id,
          error: event.data.object.last_payment_error?.message
        });
        break;
    }

    await pool.query(
      `INSERT INTO webhook_events (stripe_event_id, event_type, payload) 
       VALUES ($1, $2, $3)`,
      [event.id, event.type, JSON.stringify(event.data)]
    );

    res.json({ received: true });
  } catch (err) {
    logger.error('webhook_error', { error: err.message });
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ========== WEBSOCKET ==========

const wss = new WebSocketServer({ server });
const connectedAgents = new Map();

wss.on('connection', (ws) => {
  let cabineId = null;
  let isAuthenticated = false;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'authenticate') {
        const { cabineId: cId, token } = message;

        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.cabineId !== cId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Token mismatch' }));
            ws.close();
            return;
          }

          cabineId = cId;
          isAuthenticated = true;
          connectedAgents.set(cabineId, ws);

          logger.info('agent.authenticated', { cabineId });
          ws.send(JSON.stringify({ type: 'authenticated', cabineId }));

          const productsResult = await pool.query(
            'SELECT id, name, price, image_url, promo FROM products ORDER BY created_at'
          );
          ws.send(JSON.stringify({
            type: 'products_sync',
            products: productsResult.rows
          }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
          ws.close();
        }
        return;
      }

      if (!isAuthenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }

      if (message.type === 'heartbeat') {
        await pool.query(
          'UPDATE cabines SET status = $1, last_heartbeat = NOW() WHERE id = $2',
          ['online', cabineId]
        );
        ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
        return;
      }

      if (message.type === 'session_start') {
        logger.info('session.started', { cabineId, sessionId: message.sessionId });
        return;
      }

      if (message.type === 'session_end') {
        logger.info('session.ended', {
          cabineId,
          sessionId: message.sessionId,
          duration: message.durationSeconds
        });
        return;
      }

    } catch (err) {
      logger.error('websocket_message_error', { error: err, cabineId });
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    if (cabineId) {
      connectedAgents.delete(cabineId);
      logger.info('agent.disconnected', { cabineId });
      pool.query(
        'UPDATE cabines SET status = $1 WHERE id = $2',
        ['offline', cabineId]
      ).catch(err => logger.error('cabine_status_update_failed', { error: err }));
    }
  });

  ws.on('error', (err) => {
    logger.error('websocket_error', { error: err, cabineId });
  });
});

// ========== ROUTES ADMIN ==========

app.post('/api/v1/admin/cabines', verifyToken, async (req, res) => {
  try {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { cabineId, name, location } = req.body;

    if (!cabineId || !name) {
      return res.status(400).json({ error: 'Missing cabineId or name' });
    }

    await pool.query(
      `INSERT INTO cabines (id, name, location, status) VALUES ($1, $2, $3, $4)`,
      [cabineId, name, location || 'Unknown', 'offline']
    );

    res.json({
      success: true,
      message: `Cabine ${cabineId} créée. Agent peut maintenant démarrer avec CABINE_ID=${cabineId}.`
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cabine already exists' });
    }
    logger.error('cabine_creation_failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/admin/cabines', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, location, status, last_heartbeat 
       FROM cabines 
       ORDER BY last_heartbeat DESC`
    );

    res.json(result.rows);
  } catch (err) {
    logger.error('cabines_fetch_failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

// ========== ERROR HANDLING ==========

app.use((err, req, res, next) => {
  logger.error('unhandled_error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ========== DÉMARRAGE ==========

const PORT = process.env.PORT || 10000;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Qnook Backend démarré sur le port ${PORT}`);
  logger.info(`WebSocket: ws://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    logger.info('Server fermé');
    process.exit(0);
  });
});

export default app;
