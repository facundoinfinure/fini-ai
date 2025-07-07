import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { operationManager } from '@/lib/operations/operation-manager';
import { OperationType } from '@/types/operations';

/**
 * 🧪 DEBUG ENDPOINT: Test Operations System
 * =========================================
 * 
 * GET /api/debug/test-operations - Get system status
 * POST /api/debug/test-operations - Create test operations
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

    // Get current system state
    const operations = operationManager.getOperationsByUser(user.id);
    const notifications = operationManager.getAllNotifications();
    const systemStatus = operationManager.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        systemStatus,
        activeOperations: operations.filter(op => 
          ['pending', 'starting', 'in_progress', 'completing'].includes(op.status)
        ),
        allOperations: operations,
        notifications: notifications.filter(n => !n.dismissed),
        summary: {
          totalOperations: operations.length,
          activeCount: operations.filter(op => 
            ['pending', 'starting', 'in_progress', 'completing'].includes(op.status)
          ).length,
          completedCount: operations.filter(op => op.status === 'completed').length,
          failedCount: operations.filter(op => op.status === 'failed').length,
          notificationCount: notifications.filter(n => !n.dismissed).length
        }
      }
    });
    
  } catch (error) {
    console.error('[DEBUG:TEST-OPERATIONS] GET error:', error);
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
    const { scenario, storeId = 'test-store-123', storeName = 'Tienda de Prueba' } = body;
    
    const createdOperations: any[] = [];
    
    switch (scenario) {
      case 'initial_connection':
        // Simular conexión inicial de tienda (bloquea chat)
        const connectionOp = operationManager.createStoreInitialConnectionOperation(
          user.id, 
          storeId, 
          storeName
        );
        createdOperations.push(connectionOp);
        break;
        
      case 'data_update':
        // Simular actualización de datos (no bloquea chat)
        const updateOp = operationManager.createDataUpdateOperation(
          user.id, 
          storeId, 
          storeName, 
          'test_scenario'
        );
        createdOperations.push(updateOp);
        break;
        
      case 'rag_sync':
        // Simular sincronización RAG (no bloquea chat)
        const ragOp = operationManager.createRAGSyncOperation(
          user.id, 
          storeId, 
          storeName, 
          false
        );
        createdOperations.push(ragOp);
        break;
        
      case 'multiple_operations':
        // Simular múltiples operaciones simultáneas
        const ops = [
          operationManager.createDataUpdateOperation(user.id, `${storeId}-1`, `${storeName} 1`),
          operationManager.createRAGSyncOperation(user.id, `${storeId}-2`, `${storeName} 2`, false),
          operationManager.createOperation(OperationType.INVENTORY_SYNC, user.id, {
            storeId: `${storeId}-3`,
            storeName: `${storeName} 3`
          })
        ];
        createdOperations.push(...ops);
        break;
        
      case 'whatsapp_setup':
        // Simular configuración WhatsApp
        const whatsappOp = operationManager.createOperation(
          OperationType.WHATSAPP_SETUP, 
          user.id, 
          {
            storeId,
            storeName,
            metadata: { phoneNumber: '+54911234567' }
          }
        );
        createdOperations.push(whatsappOp);
        break;
        
      case 'system_maintenance':
        // Simular mantenimiento crítico (bloquea todo)
        const maintenanceOp = operationManager.createOperation(
          OperationType.SYSTEM_MAINTENANCE, 
          user.id, 
          {
            metadata: { maintenanceType: 'critical_update' }
          }
        );
        createdOperations.push(maintenanceOp);
        break;
        
      case 'failing_operation':
        // Crear operación que fallará para probar retry
        const failingOp = operationManager.createOperation(
          OperationType.TOKEN_REFRESH, 
          user.id, 
          {
            storeId,
            storeName,
            metadata: { simulateFailure: true }
          }
        );
        
        // Hacer que falle después de un momento
        setTimeout(() => {
          operationManager.failOperation(failingOp.id, 'Simulated failure for testing');
        }, 3000);
        
        createdOperations.push(failingOp);
        break;
        
      case 'quick_success':
        // Operación que se completa rápidamente
        const quickOp = operationManager.createOperation(
          OperationType.NAMESPACE_INITIALIZATION, 
          user.id, 
          {
            storeId,
            storeName
          }
        );
        
        // Completar rápidamente
        setTimeout(() => {
          operationManager.updateProgress(quickOp.id, 50, 1, 'Progreso rápido...');
          setTimeout(() => {
            operationManager.completeOperation(quickOp.id);
          }, 2000);
        }, 1000);
        
        createdOperations.push(quickOp);
        break;
        
      case 'cleanup_all':
        // Limpiar todas las operaciones del usuario
        const userOperations = operationManager.getOperationsByUser(user.id);
        userOperations.forEach(op => {
          if (['pending', 'starting', 'in_progress'].includes(op.status)) {
            operationManager.cancelOperation(op.id);
          }
        });
        
        // Limpiar notificaciones
        const allNotifications = operationManager.getAllNotifications();
        allNotifications.forEach(notification => {
          operationManager.dismissNotification(notification.id);
        });
        
        return NextResponse.json({
          success: true,
          message: 'All operations cleaned up',
          cleaned: {
            operations: userOperations.length,
            notifications: allNotifications.length
          }
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid scenario. Available: initial_connection, data_update, rag_sync, multiple_operations, whatsapp_setup, system_maintenance, failing_operation, quick_success, cleanup_all'
        }, { status: 400 });
    }
    
    console.log(`[DEBUG:TEST-OPERATIONS] Created ${createdOperations.length} operations for scenario: ${scenario}`);
    
    return NextResponse.json({
      success: true,
      scenario,
      operationsCreated: createdOperations.length,
      operations: createdOperations.map(op => ({
        id: op.id,
        type: op.type,
        title: op.title,
        status: op.status,
        estimatedDuration: op.estimatedCompletionAt.getTime() - op.startedAt.getTime()
      })),
      message: `Test scenario '${scenario}' executed successfully`
    });
    
  } catch (error) {
    console.error('[DEBUG:TEST-OPERATIONS] POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 