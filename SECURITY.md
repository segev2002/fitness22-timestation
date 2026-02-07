# Security Notes

## Known Risks

### 1. RLS Bypass via `set_current_user` RPC (CRITICAL)

The current Row-Level Security (RLS) model relies on `current_setting('app.current_user_id')`,
set via a public `set_current_user` RPC. Because the Supabase **anon key** is exposed in the
browser, any user can call this RPC with an arbitrary user ID and access/modify other users' data.

**Recommended fix:**
1. Migrate to **Supabase Auth** (`supabase.auth.signInWithPassword`).
2. Rewrite RLS policies to use `auth.uid()` instead of `current_setting(...)`.
3. Remove the `set_current_user` RPC.

### 2. Password Storage

Passwords are now hashed using SHA-256 via the Web Crypto API. Existing plain-text passwords
are automatically upgraded to hashes on the next successful login.

> **Note:** SHA-256 is a fast hash — for stronger protection, consider migrating to a
> server-side solution with bcrypt/scrypt/argon2 (e.g., via Supabase Auth or Edge Functions).

### 3. Supabase Anon Key

The `.env` file containing the Supabase URL and anon key is now excluded from git via `.gitignore`.
If the key was previously committed, **rotate it** in the Supabase dashboard.

## Checklist for Full Security Hardening

- [ ] Migrate to Supabase Auth
- [ ] Rewrite RLS policies with `auth.uid()`
- [ ] Remove `set_current_user` RPC
- [ ] Rotate Supabase anon key
- [ ] Add rate limiting on login endpoint
- [ ] Consider server-side password hashing (bcrypt/argon2)
