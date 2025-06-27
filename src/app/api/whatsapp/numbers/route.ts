import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper para generar headers CORS dinámicos
function getCorsHeaders(status = 200): ResponseInit {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    status,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };
}

export const dynamic = 'force-dynamic';

// GET - Get WhatsApp configuration for the current user
export async function GET() {
  try {
    console.log('[INFO] Fetching WhatsApp numbers from database');
    
    const supabase = createClient();
    
    // Obtener el usuario actual - usar getUser() que funciona mejor con cookies
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message || 'No user found');
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        getCorsHeaders(401)
      );
    }

    console.log('[INFO] User authenticated successfully');

    // Obtener los números de WhatsApp del usuario con sus conexiones
    const { data: whatsappNumbers, error: numbersError } = await supabase
      .from('whatsapp_numbers')
      .select(`
        id,
        phone_number,
        display_name,
        is_verified,
        is_active,
        created_at,
        whatsapp_store_connections(
          store_id,
          is_active,
          stores(id, name)
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (numbersError) {
      console.error('[ERROR] Failed to fetch WhatsApp numbers:', numbersError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch WhatsApp numbers' },
        getCorsHeaders(500)
      );
    }

    // Para cada número, obtener sus conexiones con tiendas
    const formattedNumbers = await Promise.all(
      (whatsappNumbers || []).map(async (number) => {
        const { data: connections } = await supabase
          .from('whatsapp_store_connections')
          .select(`
            id,
            store_id,
            is_active,
            stores (
              id,
              name,
              domain
            )
          `)
          .eq('whatsapp_number_id', number.id)
          .eq('is_active', true);

        const connectedStores = (connections || []).map(conn => ({
          id: conn.store_id,
          name: (conn.stores as any)?.name || '',
          domain: (conn.stores as any)?.domain || ''
        }));

        return {
          id: number.id,
          phone_number: number.phone_number,
          display_name: number.display_name,
          is_verified: number.is_verified,
          is_active: number.is_active,
          connected_stores: connectedStores,
          total_conversations: 0, // TODO: Implementar conteo real
          last_message_at: null, // TODO: Implementar fecha real
          created_at: number.created_at
        };
      })
    );

    console.log(`[INFO] Found ${formattedNumbers.length} WhatsApp numbers for user`);

    return NextResponse.json({
      success: true,
      data: formattedNumbers
    }, getCorsHeaders(200));

  } catch (error) {
          console.error('[ERROR] Failed to fetch WhatsApp numbers:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        getCorsHeaders(500)
      );
  }
}

// POST - Add a new WhatsApp number to the user's configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[INFO] Creating new WhatsApp number - FORCING OTP VERIFICATION');

    const supabase = createClient();
    
    // Obtener el usuario actual - verificar la sesión desde las cookies
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message || 'No user found');
      
              return NextResponse.json(
          { 
            success: false, 
            error: 'User not authenticated. Please refresh the page and try again.'
          },
          getCorsHeaders(401)
        );
    }

    console.log('[INFO] User authenticated successfully');

    // Validar datos requeridos
    const { phone_number, display_name, store_id } = body;
    
    if (!phone_number || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Phone number and display name are required' },
        getCorsHeaders(400)
      );
    }

    // Si se proporciona store_id, verificar que la tienda pertenece al usuario
    if (store_id) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', store_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (storeError || !store) {
        return NextResponse.json(
          { success: false, error: 'Store not found or unauthorized' },
          getCorsHeaders(404)
        );
      }
    }

    // 🔧 NUEVO COMPORTAMIENTO: Si el número ya existe, lo eliminamos y creamos uno nuevo
    // Esto fuerza SIEMPRE la verificación OTP sin importar el historial
    const { data: existingNumber } = await supabase
      .from('whatsapp_numbers')
      .select('id')
      .eq('phone_number', phone_number)
      .eq('user_id', user.id)
      .single();

    if (existingNumber) {
      console.log('[INFO] Number exists - removing it to force fresh OTP verification');
      
      // Eliminar conexiones existentes
      await supabase
        .from('whatsapp_store_connections')
        .delete()
        .eq('whatsapp_number_id', existingNumber.id);
      
      // Eliminar verificaciones existentes
      await supabase
        .from('whatsapp_verifications')
        .delete()
        .eq('whatsapp_number_id', existingNumber.id);
      
      // Eliminar el número existente
      await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', existingNumber.id);
        
      console.log('[INFO] Existing number and all related data deleted - fresh start enforced');
    }

    console.log('[INFO] Attempting to create WhatsApp number - ALWAYS UNVERIFIED');
    
    // 🔒 FUERZA ESTRICTA: SIEMPRE crear como NO VERIFICADO
    // Crear el número de WhatsApp SIEMPRE como NO VERIFICADO
    const { data: newNumber, error: createError } = await supabase
      .from('whatsapp_numbers')
      .insert({
        user_id: user.id,
        phone_number,
        display_name,
        is_active: true,
        is_verified: false, // 🔒 SIEMPRE false - NUNCA cambiar esto
        verified_at: null,  // 🔒 SIEMPRE null - NUNCA cambiar esto
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, phone_number, display_name, is_verified, created_at')
      .single();

    if (createError) {
      console.error('[ERROR] Failed to create WhatsApp number:', createError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to create WhatsApp number' },
        getCorsHeaders(500)
      );
    }

    console.log('[SUCCESS] WhatsApp number created UNVERIFIED - status enforced:', {
      id: newNumber.id,
      phone: newNumber.phone_number,
      is_verified: newNumber.is_verified, // Should ALWAYS be false
      created_at: newNumber.created_at
    });

    // Si se proporcionó store_id, crear automáticamente la conexión
    if (store_id && newNumber) {
      try {
        console.log('[INFO] Creating automatic connection to store:', store_id);
        
        const { error: connectionError } = await supabase
          .from('whatsapp_store_connections')
          .insert({
            whatsapp_number_id: newNumber.id,
            store_id: store_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (connectionError) {
          console.error('[ERROR] Failed to create store connection:', connectionError.message);
          // No fallar completamente, solo log el error
          console.log('[WARNING] WhatsApp number was created but connection to store failed');
        } else {
          console.log('[INFO] WhatsApp number automatically connected to store');
        }
      } catch (connectionErr) {
        console.error('[ERROR] Exception creating store connection:', connectionErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newNumber,
        requires_verification: true // 🔒 Siempre indica que requiere verificación
      },
      message: store_id 
        ? `WhatsApp number created and connected to store - OTP verification required`
        : `WhatsApp number created - OTP verification required`
    }, getCorsHeaders(200));

  } catch (error) {
          console.error('[ERROR] Failed to create WhatsApp number:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        getCorsHeaders(500)
      );
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, getCorsHeaders());
} 