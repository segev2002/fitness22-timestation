Migration helper: import users into Supabase
=========================================

This folder contains two helper scripts to import users previously stored in browser localStorage into your Supabase project.

Files added
- `scripts/import-users.js` — Node script that upserts users into the `users` table and optionally uploads profile files to a Supabase bucket.
- `scripts/generate-sql.js` — Converts `scripts/users.json` into `scripts/users.sql` containing INSERT statements you can run in Supabase SQL editor.

Preparation
1. Export your localStorage users from the original browser and save them as `scripts/users.json`. In the browser console:

```javascript
console.log(localStorage.getItem('attendance_users'));
```

Copy the printed JSON (an array) and save it to `scripts/users.json` in this project.

2. (Optional) If users have profile pictures referenced by `profilePicture` fields that are local filenames, put those files into `scripts/profile-files/`.

Option 1 — Quick SQL import (no keys required)
------------------------------------------------
Run the SQL generator to produce `scripts/users.sql`, then paste into Supabase SQL editor and run:

```bash
node scripts/generate-sql.js
# open scripts/users.sql and paste into Supabase Dashboard -> SQL Editor -> New query
```

Notes:
- This runs under Supabase admin privileges when executed in the dashboard, so RLS/permissions are not a problem.

Option 2 — Node import (scripted, supports file uploads)
--------------------------------------------------------
This uses `@supabase/supabase-js` and requires env vars. Prefer a temporary service-role key only in a secure environment, or use an anon key if your RLS policies permit inserts.

Set environment variables (macOS / zsh):

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_KEY="<your-service-or-anon-key>"
export SUPABASE_BUCKET="time station - data" # optional
```

Install dependency and run:

```bash
# from project root
npm install @supabase/supabase-js
node scripts/import-users.js
```

What the script does:
- reads `scripts/users.json`
- uploads files from `scripts/profile-files/` when `profilePicture` matches a filename
- upserts each user into the `users` table (onConflict: 'id')

Security notes
- Using a service-role key allows full DB changes. Do not commit keys.
- For a one-off import, the SQL editor option is simplest and safest.
- After import, consider hashing passwords and removing plaintext storage.

Verification
- Open Supabase Dashboard -> Table Editor -> users and verify records and profilePicture URLs.
- Test login on your deployed site.

If you'd like, paste your `scripts/users.json` here and I will generate the SQL now and show it to you, or I can add the files and walk you through running the Node script locally.
