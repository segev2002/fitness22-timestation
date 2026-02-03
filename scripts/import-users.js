#!/usr/bin/env node
/**
 * scripts/import-users.js
 *
 * Read users.json (array of user objects) and upsert into Supabase `users` table.
 * Optionally upload profile files from ./profile-files/ into a configured bucket
 * and set the `profilePicture` field to the public URL.
 *
 * Usage (macOS / zsh):
 *   export SUPABASE_URL="https://xxx.supabase.co"
 *   export SUPABASE_KEY="<service-role-or-anon-key>"
 *   export SUPABASE_BUCKET="time station - data"
 *   node scripts/import-users.js
 *
 * SECURITY: Using a service-role key provides full DB access and should be used only
 * in a secure environment. For a one-off import you can also generate SQL and run it
 * in the Supabase SQL editor (no keys required) — see scripts/generate-sql.js.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'time station - data';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY env vars. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const usersPath = path.resolve(__dirname, 'users.json');
  if (!fs.existsSync(usersPath)) {
    console.error('Expected file: scripts/users.json - please place exported users JSON there.');
    process.exit(1);
  }

  const raw = fs.readFileSync(usersPath, 'utf8');
  let users;
  try {
    users = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse users.json:', err.message);
    process.exit(1);
  }

  const filesDir = path.resolve(__dirname, 'profile-files');

  for (const u of users) {
    try {
      // If profilePicture points to a local filename and file exists, upload it
      if (u.profilePicture && fs.existsSync(path.join(filesDir, u.profilePicture))) {
        const fileBuffer = fs.readFileSync(path.join(filesDir, u.profilePicture));
        const uploadPath = `profiles/${u.id}_${u.profilePicture}`;

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(uploadPath, fileBuffer, { upsert: true });

        if (uploadError) {
          console.error('Upload failed for', u.email, uploadError.message || uploadError);
        } else {
          const publicUrl = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(uploadPath).data.publicUrl;
          u.profilePicture = publicUrl;
          console.log('Uploaded profile for', u.email, '->', publicUrl);
        }
      }

      const row = {
        id: u.id,
        name: u.name || null,
        email: (u.email || '').toLowerCase(),
        password: u.password || null,
        createdAt: u.createdAt || new Date().toISOString(),
        isAdmin: !!u.isAdmin,
        isDisabled: !!u.isDisabled,
        department: u.department || null,
        profilePicture: u.profilePicture || null,
      };

      const { data, error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
      if (error) console.error('Upsert error for', u.email, error.message || error);
      else console.log('Upserted', u.email);
    } catch (err) {
      console.error('Error processing user', u && u.email, err && err.message ? err.message : err);
    }
  }

  console.log('Import complete. Verify records in Supabase Table Editor.');
}

main().catch(err => {
  console.error('Fatal error:', err && err.message ? err.message : err);
  process.exit(1);
});
