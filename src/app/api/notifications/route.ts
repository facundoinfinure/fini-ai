import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { operationManager } from '@/lib/operations/operation-manager';

/**
 * 🔔 NOTIFICATIONS API ENDPOINTS
 * ==============================
 * 
 * GET /api/notifications - Get notifications for current user
 * PUT /api/notifications - Dismiss notification
 * DELETE /api/notifications - Clear all notifications
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDismissed = searchParams.get('includeDismissed') === 'true';
    
    // Get all notifications
    let notifications = operationManager.getAllNotifications();
    
    // Filter out dismissed notifications unless explicitly requested
    if (!includeDismissed) {
      notifications = notifications.filter(n => !n.dismissed);
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        count: notifications.length
      }
    });
    
  } catch (error) {
    console.error('[API:NOTIFICATIONS] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;
    
    if (!notificationId) {
      return NextResponse.json({
        success: false,
        error: 'Notification ID is required'
      }, { status: 400 });
    }
    
    // Dismiss notification
    operationManager.dismissNotification(notificationId);
    
    console.log(`[API:NOTIFICATIONS] Dismissed notification: ${notificationId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Notification dismissed successfully'
    });
    
  } catch (error) {
    console.error('[API:NOTIFICATIONS] PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get all notifications and dismiss them
    const notifications = operationManager.getAllNotifications();
    
    notifications.forEach(notification => {
      operationManager.dismissNotification(notification.id);
    });
    
    console.log(`[API:NOTIFICATIONS] Dismissed ${notifications.length} notifications`);
    
    return NextResponse.json({
      success: true,
      message: `Dismissed ${notifications.length} notifications`
    });
    
  } catch (error) {
    console.error('[API:NOTIFICATIONS] DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 