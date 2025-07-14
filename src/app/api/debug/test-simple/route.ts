export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('🔴 DEBUG ENDPOINT FUNCIONANDO');
  
  return Response.json({
    success: true,
    message: "🔴 Este endpoint funciona correctamente",
    timestamp: new Date().toISOString(),
    debug: true
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
} 