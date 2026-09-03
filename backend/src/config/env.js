require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',

  // PostgreSQL + PostGIS
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://nla_user:nla_dev_password@localhost:5432/nla_db',
};
