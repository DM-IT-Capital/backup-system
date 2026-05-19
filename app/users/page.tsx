'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// You need a service role client to bypass email invites
export async function addUserManually(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const role = formData.get('role'); // e.g., 'admin', 'customer'

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Initialize Supabase with Service Role Key (found in Vercel Env Vars)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create the user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.toString(),
    password: password.toString(),
    email_confirm: true, // Confirm email immediately so they can login
    user_metadata: { role: role }
  });

  if (authError) {
    return { error: authError.message };
  }

  // 2. (Optional) If you have a separate 'users' or 'customers' table, add a row here
  // await supabase.from('users').insert({ id: authData.user.id, role: role });

  return { success: `User ${email} added successfully.` };
}