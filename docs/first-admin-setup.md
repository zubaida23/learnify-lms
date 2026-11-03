# First Admin Setup

This document explains the one-time manual admin bootstrap procedure for the Learnify LMS.

Important:
- This operation must be performed manually in the Supabase SQL Editor using an elevated database/admin session.
- It is not part of the executable migration sequence.
- It must never run automatically as part of an app migration or a runtime client request.
- It should never be exposed to public or authenticated app users via RPC.

Procedure:
1. Open the Supabase SQL Editor.
2. Connect with an elevated admin session or a privileged database role.
3. Confirm the target user exists in `auth.users` and has a matching row in `public.profiles`.
4. Verify no admin user already exists in `public.profiles`.
5. Run a one-time statement similar to:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<target-user-id>'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = '<target-user-id>'
      AND p.role = 'student'
  );
```

6. Validate the update by checking the target profile row.

Security requirements:
- This operation must be manual and intentional.
- It must not be callable by ordinary authenticated users.
- No application RPC should expose an unrestricted bootstrap function.
- This process is separate from executable migrations and should remain documented outside the app migration pipeline.
