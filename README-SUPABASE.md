# GX Helpdesk Report — Supabase patch

## Files in this patch
- `api/report.js` and `api/health.js`: Vercel API routes.
- `lib/store.js`: server-only Supabase storage layer.
- `supabase/schema.sql`: creates the database tables and RPC functions.
- `scripts/check.mjs`: checks repository structure and JavaScript syntax.

## Apply to GitHub
Upload/replace these files in the `triretnoizzap06-creator/gxhelpdeskreport` repository, keeping the same paths. Make sure `api/` and `supabase/` are folders at the repository root.

## Supabase
1. Open Supabase Dashboard → SQL Editor → New query.
2. Paste and run `supabase/schema.sql`.

## Vercel Environment Variables
In Vercel → project `gxhelpdeskreport` → Settings → Environment Variables, add:
- `SUPABASE_URL`: Project URL from Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service_role/secret key.
- `PUBLISH_KEY`: a password you choose to restrict saving/editing.

Never put `SUPABASE_SERVICE_ROLE_KEY` in `index.html`, client-side JavaScript, or a public GitHub file. Do not send it in chat. The service role key bypasses RLS and must only exist as a Vercel server environment variable.

After saving variables, redeploy the project. Test:
`https://gxhelpdeskreport.vercel.app/api/health`

A response containing `"storage": "ok"` means the table connection works. Then open the app, enter the Publish password when prompted, and import data from the browser that currently has the report. The first upload populates the shared report for other viewers.

## Access note
`PUBLISH_KEY` restricts write operations only. Anyone who has the report URL can still read the shared report. Use Vercel Deployment Protection or another access-control layer if the report itself must be private.
