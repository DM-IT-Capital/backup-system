# Save fix notes

This patch fixes the issue where a new item appears in the UI, then disappears after refresh.

Cause:
- The UI was updating local state before the API response completed.
- Several API calls were silently ignored when Supabase rejected the insert/update/delete.
- With Supabase RLS enabled, server-side write routes should use the service role key after checking that the request has a valid logged-in Supabase session.

What changed:
- Create operations now wait for Supabase to save successfully before showing the item in the UI.
- API errors are now shown in the page status line instead of failing silently.
- Write APIs now authenticate the user with the normal Supabase session, then perform database writes with `SUPABASE_SERVICE_ROLE_KEY` from the server.
- Returned Supabase UUIDs are used in the UI, so edit/delete works correctly after creating a new item.

Required Vercel variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

After deploying, redeploy with Vercel build cache disabled.
