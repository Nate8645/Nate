'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'data', 'coverage']);
const secretPatterns = [
  /sk_live_[A-Za-z0-9]+/,
  /sk_test_[A-Za-z0-9]{20,}/,
  /whsec_[A-Za-z0-9]{20,}/,
  /OPENAI_API_KEY\s*=\s*sk-[A-Za-z0-9]/,
];
let failures = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|json|md|example|css|yml|yaml|txt)$/.test(entry.name)) check(full);
  }
}

function check(file) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      console.error(`Potential secret found in ${rel}`);
      failures += 1;
    }
  }
  if (file.endsWith('.js')) {
    try {
      new Function(text);
    } catch (error) {
      console.error(`Syntax check failed in ${rel}: ${error.message}`);
      failures += 1;
    }
  }
}

walk(ROOT);
if (failures) process.exit(1);
console.log('Basic lint passed: no obvious committed secrets and JS parses.');
