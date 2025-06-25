import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
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
        created_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (numbersError) {
      console.error('[ERROR] Failed to fetch WhatsApp numbers:', numbersError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch WhatsApp numbers' },
        { status: 500 }
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
    }, {
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch WhatsApp numbers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new WhatsApp number to the user's configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[INFO] Creating new WhatsApp number');

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
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    console.log('[INFO] User authenticated successfully');

    // Validar datos requeridos
    const { phone_number, display_name } = body;
    
    if (!phone_number || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Phone number and display name are required' },
        { status: 400 }
      );
    }

    // Verificar que el número no existe ya
    const { data: existingNumber } = await supabase
      .from('whatsapp_numbers')
      .select('id')
      .eq('phone_number', phone_number)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (existingNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number already exists' },
        { status: 409 }
      );
    }

    console.log('[INFO] Attempting to create WhatsApp number');

    // Crear el nuevo número de WhatsApp
    const { data: newNumber, error: createError } = await supabase
      .from('whatsapp_numbers')
      .insert({
        user_id: user.id,
        phone_number,
        display_name,
        is_verified: false,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('[ERROR] Failed to create WhatsApp number:', createError.message);
      console.error('[ERROR] Error code:', createError.code);
      
      // Específicamente para errores de RLS
      if (createError.message.includes('row-level security policy')) {
        console.error('[ERROR] RLS Policy violation detected');
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Permission denied. There is an authentication issue with the database policies.',
            technical_details: 'RLS policy violation - user authentication context not properly set'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Failed to create WhatsApp number: ${createError.message}` },
        { status: 500 }
      );
    }

    console.log('[INFO] WhatsApp number created successfully');

    return NextResponse.json({
      success: true,
      data: {
        ...newNumber,
        connected_stores: [],
        total_conversations: 0,
        last_message_at: null
      }
    }, {
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to create WhatsApp number:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 