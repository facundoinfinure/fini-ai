import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code is required'
      }, { status: 400 });
    }

    const CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID;
    const CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET;

    console.log('[DEBUG] Starting token exchange debug...');
    console.log('[DEBUG] Environment variables check:', {
      CLIENT_ID_exists: !!CLIENT_ID,
      CLIENT_SECRET_exists: !!CLIENT_SECRET,
      CLIENT_ID_value: CLIENT_ID ? CLIENT_ID.substring(0, 10) + '...' : 'missing',
      code_received: code ? code.substring(0, 10) + '...' : 'missing'
    });

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Server configuration error: Missing TiendaNube credentials',
        debug: {
          CLIENT_ID_exists: !!CLIENT_ID,
          CLIENT_SECRET_exists: !!CLIENT_SECRET
        }
      }, { status: 500 });
    }

    // 🔥 FIX: Use application/x-www-form-urlencoded as per OAuth2 standard
    const requestBody = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    });

    console.log('[DEBUG] Request body (sanitized):', {
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code.substring(0, 10) + '...',
      client_secret: CLIENT_SECRET.substring(0, 10) + '...'
    });

    const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FiniAI/1.0 (WhatsApp Analytics for TiendaNube) - Debug',
      },
      body: requestBody.toString(),
    });

    const responseText = await response.text();
    
    console.log('[DEBUG] Response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { raw_response: responseText };
      }

      return NextResponse.json({
        success: false,
        error: 'TiendaNube API error',
        debug: {
          status: response.status,
          statusText: response.statusText,
          errorData,
          responseText
        }
      }, { status: response.status });
    }

    let authData;
    try {
      authData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[DEBUG] Failed to parse success response:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON response from TiendaNube',
        debug: {
          responseText,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      }, { status: 500 });
    }

    console.log('[DEBUG] Parsed auth data:', {
      has_access_token: !!authData.access_token,
      has_user_id: !!authData.user_id,
      access_token_preview: authData.access_token ? authData.access_token.substring(0, 10) + '...' : 'missing',
      user_id: authData.user_id,
      full_response_keys: Object.keys(authData),
      full_response: authData
    });

    const isValid = !!(authData.access_token && authData.user_id);

    return NextResponse.json({
      success: isValid,
      error: !isValid ? 'Invalid response from TiendaNube: missing access_token or user_id' : undefined,
      debug: {
        has_access_token: !!authData.access_token,
        has_user_id: !!authData.user_id,
        access_token_preview: authData.access_token ? authData.access_token.substring(0, 10) + '...' : 'missing',
        user_id: authData.user_id,
        response_keys: Object.keys(authData),
        response_structure: authData,
        environment: {
          CLIENT_ID_exists: !!CLIENT_ID,
          CLIENT_SECRET_exists: !!CLIENT_SECRET
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG] Critical error in token exchange debug:', error);
    return NextResponse.json({
      success: false,
      error: 'Critical error during token exchange',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OAuth Token Exchange Debug Endpoint',
    usage: 'POST with { "code": "authorization_code" }',
    purpose: 'Debug TiendaNube OAuth token exchange issues'
  });
} 