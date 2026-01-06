import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createServerSupabaseClient = () => {
  return createServerComponentClient({ cookies });
};

export async function getUser() {
  const supabase = createServerSupabaseClient();
  
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    return user;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

export async function getSession() {
  const supabase = createServerSupabaseClient();
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    return session;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}