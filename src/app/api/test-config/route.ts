export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    components: {
      configurationManagement: 'available',
      dashboardContent: 'available'
    }
  });
}