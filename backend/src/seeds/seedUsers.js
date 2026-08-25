const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { ROLES } = require('../config/constants');

async function seedUsers() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  if (count > 0) {
    console.log('[SEED] Users table already has data. Skipping seed.');
    return;
  }

  console.log('[SEED] Seeding initial demo users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const demoUsers = [
    {
      id: generateId(),
      email: 'dlao@nla.gov.in',
      password_hash: passwordHash,
      full_name: 'Rajesh Sharma',
      role: ROLES.DLAO,
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      phone: '+91 98765 43210',
    },
    {
      id: generateId(),
      email: 'pia@nla.gov.in',
      password_hash: passwordHash,
      full_name: 'NHAI Infrastructure Authority',
      role: ROLES.PIA,
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      phone: '+91 98765 43211',
    },
    {
      id: generateId(),
      email: 'sga@nla.gov.in',
      password_hash: passwordHash,
      full_name: 'Dr. Vikramaditya Singh',
      role: ROLES.SGA,
      state: 'Uttar Pradesh',
      district: 'All Districts',
      phone: '+91 98765 43212',
    },
    {
      id: generateId(),
      email: 'fro@nla.gov.in',
      password_hash: passwordHash,
      full_name: 'Amit Kumar Verma',
      role: ROLES.FRO,
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      phone: '+91 98765 43213',
    },
    {
      id: generateId(),
      email: 'admin@nla.gov.in',
      password_hash: passwordHash,
      full_name: 'System Admin',
      role: ROLES.ADMIN,
      state: 'National',
      district: 'All',
      phone: '+91 98765 43214',
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, state, district, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((users) => {
    for (const u of users) {
      stmt.run(u.id, u.email, u.password_hash, u.full_name, u.role, u.state, u.district, u.phone);
    }
  });

  insertMany(demoUsers);
  console.log(`[SEED] Successfully seeded ${demoUsers.length} demo users.`);
}

module.exports = { seedUsers };
