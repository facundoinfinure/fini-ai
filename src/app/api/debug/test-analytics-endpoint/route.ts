import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[DEBUG] Testing analytics endpoint functionality');
  
  try {
    const supabase = createClient();
    
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error('[DEBUG] Database connection failed:', testError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError.message
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Database connection successful');
    
    // Test analytics structure
    const mockAnalytics = {
      revenue: {
        current: 1250.50,
        previous: 980.25,
        change: 27.6,
        period: 'último mes'
      },
      orders: {
        current: 45,
        previous: 38,
        change: 18.4,
        period: 'último mes'
      },
      customers: {
        current: 32,
        previous: 28,
        change: 14.3,
        period: 'último mes'
      },
      avgOrderValue: {
        current: 27.79,
        previous: 25.80,
        change: 7.7
      },
      topProducts: [
        { name: 'Producto A', sales: 300, quantity: 12, change: 15 },
        { name: 'Producto B', sales: 250, quantity: 8, change: -5 }
      ],
      salesByDay: [
        { date: '2024-01-01', sales: 100, orders: 3 },
        { date: '2024-01-02', sales: 150, orders: 5 }
      ],
      conversionMetrics: {
        conversionRate: 3.2,
        abandonedCarts: 12,
        returnCustomers: 8
      },
      storesConnected: 1
    };
    
    console.log('[DEBUG] Analytics structure created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Analytics endpoint test successful',
      data: mockAnalytics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[DEBUG] Analytics test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Analytics test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 