import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 👤 USER PROFILE MANAGEMENT ENDPOINT
 * ==================================
 * 
 * GET: Obtiene el perfil completo del usuario
 * PUT: Actualiza la información del perfil
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Obtener perfil del usuario
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[USER-PROFILE] Getting user profile');
    
    const supabase = createClient();
    
    // 🔐 SECURITY FIX: Use getUser() instead of getSession() for server-side auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[USER-PROFILE] No valid user found:', authError?.message);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        business_name,
        business_type,
        business_description,
        target_audience,
        competitors
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[USER-PROFILE] Error fetching profile:', profileError);
      return NextResponse.json({
        success: false,
        error: 'Error fetching user profile'
      }, { status: 500 });
    }

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404 });
    }

    // Format response
    const profileData = {
      id: userProfile.id,
      email: userProfile.email,
      fullName: userProfile.full_name,
      businessProfile: {
        businessName: userProfile.business_name,
        businessType: userProfile.business_type,
        description: userProfile.business_description,
        targetAudience: userProfile.target_audience,
        competitors: userProfile.competitors || []
      }
    };

    console.log('[USER-PROFILE] Profile retrieved successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('[USER-PROFILE] GET error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * PUT: Actualizar perfil del usuario
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('[USER-PROFILE] Updating user profile');
    
    const supabase = createClient();
    
    // 🔐 SECURITY FIX: Use getUser() instead of getSession() for server-side auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[USER-PROFILE] No valid user found:', authError?.message);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { fullName, businessProfile } = body;

    if (!fullName || !businessProfile) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate businessProfile structure
    const { 
      businessName, 
      businessType, 
      description, 
      targetAudience, 
      competitors 
    } = businessProfile;

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        business_name: businessName,
        business_type: businessType,
        business_description: description,
        target_audience: targetAudience,
        competitors: competitors || []
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[USER-PROFILE] Error updating profile:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Error updating user profile'
      }, { status: 500 });
    }

    console.log('[USER-PROFILE] Profile updated successfully for user:', user.id);

    // Return updated profile in the same format as GET
    const profileData = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      fullName: updatedProfile.full_name,
      businessProfile: {
        businessName: updatedProfile.business_name,
        businessType: updatedProfile.business_type,
        description: updatedProfile.business_description,
        targetAudience: updatedProfile.target_audience,
        competitors: updatedProfile.competitors || []
      }
    };

    return NextResponse.json({
      success: true,
      data: profileData,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('[USER-PROFILE] PUT error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 