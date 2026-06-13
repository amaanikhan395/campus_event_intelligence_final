const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { port, env } = require('./config');
const eventsRouter = require('./routes/events');
const analyticsRouter = require('./routes/analytics');
const organizationsRouter = require('./routes/organizations');
const exportsRouter = require('./routes/exports');
const authRouter = require('./routes/auth');
const { notFound, errorHandler } = require('./middleware/errors');

function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env === 'test' ? 'tiny' : 'dev'));
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', project: 'Campus Event Intelligence Platform', version: '2.0.0' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/organizations', organizationsRouter);
  app.use('/api/exports', exportsRouter);

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  createApp().listen(port, () => {
    console.log(`Campus Event Intelligence Platform running at http://localhost:${port}`);
  });
}

module.exports = createApp;
