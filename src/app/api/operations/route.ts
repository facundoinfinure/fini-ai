import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { operationManager } from '@/lib/operations/operation-manager';
import { OperationType, OperationStatus } from '@/types/operations';

/**
 * 🎯 OPERATIONS API ENDPOINTS
 * ==========================
 * 
 * GET /api/operations - Get operations for current user
 * POST /api/operations - Create new operation
 * PUT /api/operations - Update operation progress
 * DELETE /api/operations - Cancel operation
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
    const storeId = searchParams.get('storeId');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    
    // Get operations for user
    let operations = operationManager.getOperationsByUser(user.id);
    
    // Filter by store if specified
    if (storeId) {
      operations = operations.filter(op => op.storeId === storeId);
    }
    
    // Filter out completed operations unless explicitly requested
    if (!includeCompleted) {
      operations = operations.filter(op => 
        ![OperationStatus.COMPLETED, OperationStatus.CANCELLED].includes(op.status)
      );
    }
    
    // Get notifications
    const notifications = operationManager.getAllNotifications()
      .filter(n => !n.dismissed);
    
    // Get system status
    const systemStatus = operationManager.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        operations,
        notifications,
        systemStatus
      }
    });
    
  } catch (error) {
    console.error('[API:OPERATIONS] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { type, storeId, storeName, metadata = {} } = body;
    
    if (!type || !Object.values(OperationType).includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid operation type'
      }, { status: 400 });
    }
    
    // Create operation
    const operation = operationManager.createOperation(type, user.id, {
      storeId,
      storeName,
      metadata
    });
    
    console.log(`[API:OPERATIONS] Created operation: ${operation.id} (${type})`);
    
    return NextResponse.json({
      success: true,
      data: operation
    });
    
  } catch (error) {
    console.error('[API:OPERATIONS] POST error:', error);
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
    const { operationId, action, progress, currentStep, currentStepDescription, error } = body;
    
    if (!operationId) {
      return NextResponse.json({
        success: false,
        error: 'Operation ID is required'
      }, { status: 400 });
    }
    
    // Verify operation belongs to user
    const operation = operationManager.getAllOperations().find(op => 
      op.id === operationId && op.userId === user.id
    );
    
    if (!operation) {
      return NextResponse.json({
        success: false,
        error: 'Operation not found'
      }, { status: 404 });
    }
    
    // Perform action
    switch (action) {
      case 'progress':
        if (typeof progress !== 'number') {
          return NextResponse.json({
            success: false,
            error: 'Progress must be a number'
          }, { status: 400 });
        }
        operationManager.updateProgress(operationId, progress, currentStep, currentStepDescription);
        break;
        
      case 'complete':
        operationManager.completeOperation(operationId);
        break;
        
      case 'fail':
        if (!error) {
          return NextResponse.json({
            success: false,
            error: 'Error message is required for fail action'
          }, { status: 400 });
        }
        operationManager.failOperation(operationId, error);
        break;
        
      case 'retry':
        operationManager.retryOperation(operationId);
        break;
        
      case 'pause':
        operationManager.pauseOperation(operationId);
        break;
        
      case 'resume':
        operationManager.resumeOperation(operationId);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
    
    console.log(`[API:OPERATIONS] Updated operation ${operationId}: ${action}`);
    
    return NextResponse.json({
      success: true,
      message: `Operation ${action} successful`
    });
    
  } catch (error) {
    console.error('[API:OPERATIONS] PUT error:', error);
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

    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');
    
    if (!operationId) {
      return NextResponse.json({
        success: false,
        error: 'Operation ID is required'
      }, { status: 400 });
    }
    
    // Verify operation belongs to user
    const operation = operationManager.getAllOperations().find(op => 
      op.id === operationId && op.userId === user.id
    );
    
    if (!operation) {
      return NextResponse.json({
        success: false,
        error: 'Operation not found'
      }, { status: 404 });
    }
    
    // Cancel operation
    operationManager.cancelOperation(operationId);
    
    console.log(`[API:OPERATIONS] Cancelled operation: ${operationId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Operation cancelled successfully'
    });
    
  } catch (error) {
    console.error('[API:OPERATIONS] DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 