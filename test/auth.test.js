'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { openDatabase } = require('../src/db');
const { hashPassword, verifyPassword, createUser } = require('../src/auth');

test('password hashing verifies valid password and rejects invalid password', () => {
  const stored = hashPassword('StrongPass123');
  assert.equal(verifyPassword('StrongPass123', stored), true);
  assert.equal(verifyPassword('WrongPass123', stored), false);
  assert.notEqual(stored, 'StrongPass123');
});

test('first registered user becomes admin', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultra-auth-'));
  const db = openDatabase(path.join(dir, 'test.sqlite'));
  const user = createUser(db, { name: 'Admin User', email: 'admin@example.com', password: 'StrongPass123' });
  assert.equal(user.role, 'admin');
  const user2 = createUser(db, { name: 'Normal User', email: 'user@example.com', password: 'StrongPass123' });
  assert.equal(user2.role, 'user');
  db.close?.();
});
