import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './server/routes/authRoutes.ts';
import pbxRoutes from './server/routes/pbxRoutes.ts';
import agentsRoutes from './server/routes/agentsRoutes.ts';
import callsRoutes from './server/routes/callsRoutes.ts';
import crmRoutes from './server/routes/crmRoutes.ts';
import analyticsRoutes from './server/routes/analyticsRoutes.ts';
import smsRoutes from './server/routes/smsRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/pbx', pbxRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/calls', callsRoutes);
  app.use('/api/crm', crmRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/sms', smsRoutes);

  // Health checks
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'DialWise AI Virtual PBX & Agentic SDR Engine',
      timestamp: new Date().toISOString(),
    });
  });
  app.get('/healthz', (req, res) => res.sendStatus(200));
  app.get('/readyz', (req, res) => res.sendStatus(200));

  if (!isProd) {
    // Vite Dev Server middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    // __dirname here is the bundled dist/ folder (esbuild outputs to dist/server.js),
    // so the built client assets live alongside it at dist/client.
    const distPath = path.resolve(__dirname, 'client');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 DialWise AI PBX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
