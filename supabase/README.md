# Supabase

This folder contains database artifacts for the caregiver backend.

## Migrations

- `20260618115234_caregiver_push_tokens.sql` creates FCM token storage for caregiver devices.
- `20260620000000_caregiver_history.sql` creates persisted caregiver alerts and message history.

Apply migrations with your usual Supabase workflow before enabling the backend
environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The application server only uses the service role key from the backend. Browser
clients should not receive Supabase credentials for these caregiver tables.
