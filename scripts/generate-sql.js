/**
 * scripts/generate-sql.js
 *
 * Read scripts/users.json and produce scripts/users.sql containing INSERT statements
 * that you can paste into Supabase SQL editor.
 *
 * Usage:
 *   node scripts/generate-sql.js
 * Output: scripts/users.sql
 */

const fs = require('fs');
const path = require('path');

const usersPath = path.resolve(__dirname, 'users.json');
if (!fs.existsSync(usersPath)) {
  console.error('Missing scripts/users.json - export your attendance_users into this file first.');
  process.exit(1);
}

const raw = fs.readFileSync(usersPath, 'utf8');
let users;
try { users = JSON.parse(raw); } catch (err) { console.error('Invalid JSON:', err.message); process.exit(1); }

function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

const cols = ['id','name','email','password','createdAt','isAdmin','isDisabled','department','profilePicture'];

const sql = users.map(u => {
  const vals = cols.map(c => q(u[c] !== undefined ? u[c] : null));
  return `INSERT INTO public.users (${cols.join(',')}) VALUES (${vals.join(',')});`;
}).join('\n\n');

const outPath = path.resolve(__dirname, 'users.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Wrote', outPath, '- paste into Supabase SQL editor.');
