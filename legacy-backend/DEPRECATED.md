# Legacy Backend (Deprecated)

> **This Express.js backend has been superseded by Supabase.**

All API endpoints, authentication, and data storage are now handled by:
- **Supabase Auth** – JWT-based authentication with RLS
- **Supabase PostgreSQL** – Database with Row-Level Security policies
- **Supabase Edge Functions** – Serverless RPCs (e.g., `safe_request_book`)
- **Supabase Storage** – Book image uploads with access control

## Migration Status

| Legacy Endpoint | Supabase Replacement |
|----------------|----------------------|
| `POST /api/auth/register` | `supabase.auth.signUp()` |
| `POST /api/auth/login` | `supabase.auth.signInWithPassword()` |
| `GET /api/books` | `supabase.from('books').select()` |
| `POST /api/books` | `supabase.from('books').insert()` |
| `POST /api/requests` | `supabase.rpc('safe_request_book')` |

## Do Not Use

This folder is preserved for reference only. It is excluded from builds and CI.
If you need to modify backend logic, use Supabase migrations in `/supabase/schema.sql`.
