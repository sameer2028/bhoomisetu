const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const env = require('./config/env');
const { initializeDatabase, closeDb } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express
const app = express();

// ─── Core Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Static file serving for uploads ────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Database Readiness Middleware ───────────────────────────────
let dbReady = false;
let dbError = null;

app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  if (dbError) {
    return res.status(500).json({ success: false, error: `Database initialization error: ${dbError.message}` });
  }
  if (!dbReady) {
    let waited = 0;
    while (!dbReady && !dbError && waited < 300) {
      await new Promise((r) => setTimeout(r, 100));
      waited++;
    }
    if (!dbReady && !dbError) {
      return res.status(503).json({ success: false, error: 'Database initializing. Please retry in a few seconds.' });
    }
  }
  next();
});

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'National Land Acquisition System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.nodeEnv,
    dbReady,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/projects', require('./modules/projects/projects.routes'));
app.use('/api/parcels', require('./modules/parcels/parcels.routes'));
app.use('/api/gis', require('./modules/gis/gis.routes'));
app.use('/api/workflow', require('./modules/workflow/workflow.routes'));
app.use('/api/documents', require('./modules/documents/documents.routes'));
app.use('/api/rr', require('./modules/rr/rr.routes'));
app.use('/api/alerts', require('./modules/alerts/alerts.routes'));
app.use('/api/audit', require('./modules/audit/audit.routes'));
app.use('/api/audit-trail', require('./modules/audit/audit.routes'));
app.use('/api/search', require('./modules/search/search.routes'));
app.use('/api/compensation', require('./modules/compensation/compensation.routes'));
app.use('/api/ai', require('./modules/ai/ai.routes'));

// ─── Constants endpoint (for frontend enums) ───────────────────────
const constants = require('./config/constants');
app.get('/api/constants', (req, res) => {
  res.json({
    success: true,
    data: {
      roles: constants.ROLES,
      roleLabels: constants.ROLE_LABELS,
      projectStatus: constants.PROJECT_STATUS,
      acquisitionStatus: constants.ACQUISITION_STATUS,
      workflowStages: constants.WORKFLOW_STAGES,
      workflowStagesOrder: constants.WORKFLOW_STAGES_ORDER,
      caseStatus: constants.CASE_STATUS,
      compensationStatus: constants.COMPENSATION_STATUS,
      possessionStatus: constants.POSSESSION_STATUS,
      documentTypes: constants.DOCUMENT_TYPES,
      alertTypes: constants.ALERT_TYPES,
      priority: constants.PRIORITY,
    },
  });
});

// ─── Error Handling ─────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Initialize DB and Start Server ─────────────────────────────────
let server;

const { execSync } = require('child_process');

function killPortProcess(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== String(process.pid)) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`[Server] Automatically freed port ${port} (terminated PID ${pid})`);
            } catch (e) {
              // Ignore if already terminated
            }
          }
        }
      }
    }
  } catch (err) {
    // Port is free
  }
}

async function start() {
  killPortProcess(env.port);

  server = app.listen(env.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  National Land Acquisition & Management System — Backend    ║
║  ──────────────────────────────────────────────────────────  ║
║  Environment: ${env.nodeEnv.padEnd(44)} ║
║  Server:      http://localhost:${String(env.port).padEnd(29)} ║
║  API:         http://localhost:${String(env.port)}/api/health${' '.repeat(18)} ║
║  Frontend:    ${env.frontendUrl.padEnd(44)} ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[FATAL] Port ${env.port} is already in use by another process.`);
      console.error(`To free port ${env.port} on Windows, run: taskkill /F /IM node.exe`);
      process.exit(1);
    }
  });

  try {
    await initializeDatabase();
    dbReady = true;
  } catch (err) {
    dbError = err;
    console.error(`\n[FATAL] Database initialization failed: ${err.message}\n`);
  }
}

start();

// Graceful shutdown
async function shutdown() {
  console.log('\n[Server] Shutting down...');
  if (server) server.close();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
