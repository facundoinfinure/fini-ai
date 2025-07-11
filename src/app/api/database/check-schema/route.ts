import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DISABLED: Causing build errors in production
// This endpoint tries to access information_schema.columns which doesn't exist in Supabase
export async function GET() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Schema check endpoint disabled due to build errors',
      message: 'This endpoint has been disabled because it causes build failures in production'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
} 