'use strict';

require('dotenv').config();
const { openDatabase } = require('../src/db');
const { createUser } = require('../src/auth');

const db = openDatabase(process.env.DATABASE_PATH || 'data/ultralaunch.sqlite');
const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe12345';

try {
  const user = createUser(db, { name: 'Admin', email, password });
  console.log(`Seeded admin user: ${user.email}`);
  console.log(`Password: ${password}`);
  console.log('Change this password immediately outside local demo environments.');
} catch (error) {
  console.log(`Seed skipped: ${error.message}`);
} finally {
  db.close?.();
}
