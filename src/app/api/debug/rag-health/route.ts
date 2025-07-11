// DISABLED: Causing build errors in production
export async function GET() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Debug endpoint disabled during build',
      message: 'This debug endpoint has been disabled to prevent build failures'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
} 