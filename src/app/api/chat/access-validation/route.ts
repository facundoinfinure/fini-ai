import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateChatAccess } from '@/lib/middleware/dashboard-access-validator';

/**
 * 🔒 CHAT ACCESS VALIDATION ENDPOINT
 * =================================
 * 
 * Valida si un usuario puede acceder a la sección de chat
 * Requiere: store + whatsapp + suscripción + onboarding
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('[CHAT-ACCESS] Validating chat access');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('[CHAT-ACCESS] No valid session found');
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found',
        canAccess: false,
        missing: ['authentication']
      }, { status: 401 });
    }

    // Validate chat access using our middleware
    const accessResult = await validateChatAccess(session.user.id);
    
    console.log('[CHAT-ACCESS] Validation result:', {
      userId: session.user.id,
      canAccess: accessResult.canAccess,
      missing: accessResult.missing,
      details: accessResult.details
    });

    return NextResponse.json({
      success: true,
      canAccess: accessResult.canAccess,
      missing: accessResult.missing,
      details: accessResult.details,
      user: accessResult.user
    });

  } catch (error) {
    console.error('[CHAT-ACCESS] Validation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error validating chat access',
      canAccess: false,
      missing: ['validation_error']
    }, { status: 500 });
  }
} 