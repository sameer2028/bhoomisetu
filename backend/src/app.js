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

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'National Land Acquisition System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.nodeEnv,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/projects', require('./modules/projects/projects.routes'));
// Phase 4: Parcel routes
// app.use('/api/parcels', require('./modules/parcels/routes'));
// ... more routes added per phase

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
initializeDatabase();

const server = app.listen(env.port, () => {
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  closeDb();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  closeDb();
  server.close(() => process.exit(0));
});

module.exports = app;
