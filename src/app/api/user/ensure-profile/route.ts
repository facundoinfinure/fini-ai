import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    console.log('[INFO] Ensuring user profile exists in public.users');
    
    const supabase = createClient();
    
    // 🔐 SECURITY FIX: Use getUser() instead of getSession() for server-side auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[ERROR] No authenticated user found:', authError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const { id, email, user_metadata } = user;
    console.log('[INFO] Checking user profile for:', email, 'ID:', id);

    // Check if user exists in public.users
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (existingUser && !userError) {
      console.log('[INFO] User profile already exists');
      return NextResponse.json({
        success: true,
        data: existingUser,
        created: false
      });
    }

    console.log('[INFO] User profile does not exist, creating new profile');

    // Create the user in public.users with proper full name extraction
    const fullName = user_metadata?.full_name || 
                     user_metadata?.name || 
                     user_metadata?.display_name ||
                     (user_metadata?.first_name && user_metadata?.last_name ? 
                       `${user_metadata.first_name} ${user_metadata.last_name}` : '') ||
                     '';
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id,
        email: email || '',
        name: user_metadata?.name || user_metadata?.full_name || '',
        full_name: fullName,
        image: user_metadata?.avatar_url || user_metadata?.picture || ''
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ERROR] Failed to create user profile:', insertError);
      return NextResponse.json({
        success: false,
        error: `Failed to create user profile: ${insertError.message}`
      }, { status: 500 });
    }

    console.log('[INFO] User profile created successfully');

    return NextResponse.json({
      success: true,
      data: newUser,
      created: true
    });

  } catch (error) {
    console.error('[ERROR] Failed to ensure user profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 