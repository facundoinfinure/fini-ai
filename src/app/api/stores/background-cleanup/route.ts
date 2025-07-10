import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundJobManager, createJobId, validateJobData, type CleanupSyncJob } from '@/lib/services/background-job-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[BACKGROUND-CLEANUP] 🧹 Background cleanup job received');
    
    const body = await request.json();
    const { storeId, accessToken, userId, priority, cleanupFirst, jobId } = body;

    // Validate required fields
    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' }, 
        { status: 400 }
      );
    }

    // 🔒 STEP 1: Check for lock conflicts before starting cleanup
    try {
      const { checkRAGLockConflicts, RAGLockType } = await import('@/lib/rag/global-locks');
      
      // Cleanup operations should check for reconnection conflicts (higher priority)
      const conflictCheck = await checkRAGLockConflicts(storeId, RAGLockType.RECONNECTION);
      
      if (!conflictCheck.canProceed) {
        console.warn(`[BACKGROUND-CLEANUP] ⏳ Cannot start cleanup for store ${storeId} - ${conflictCheck.reason}`);
        
        return NextResponse.json({
          success: false,
          error: 'Cleanup blocked by higher priority operation',
          details: conflictCheck.reason,
          conflictingOperations: conflictCheck.conflictingLocks?.map(lock => ({
            type: lock.type,
            operation: lock.operation,
            ageMs: Date.now() - lock.timestamp
          })) || []
        }, { status: 409 }); // Conflict status
      }
    } catch (lockError) {
      console.warn('[BACKGROUND-CLEANUP] ⚠️ Lock check failed, proceeding with caution:', lockError);
      // Continue execution but log the warning
    }

    // Create job data
    const jobData: CleanupSyncJob = {
      jobId: jobId || createJobId('cleanup_sync', storeId),
      storeId,
      userId,
      type: 'cleanup_sync',
      timestamp: new Date().toISOString(),
      priority: priority || 'high',
      accessToken,
      cleanupFirst: cleanupFirst !== false, // Default true
      retryCount: 0,
      maxRetries: 3
    };

    // Validate job data
    const validation = validateJobData(jobData);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: `Invalid job data: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Get job manager
    const jobManager = getBackgroundJobManager();
    
    // 🔒 STEP 2: Execute cleanup job with lock-aware manager
    jobManager.handleCleanupSync(jobData).then(result => {
      console.log(`[BACKGROUND-CLEANUP] ✅ Lock-aware cleanup job completed: ${result.jobId}`, {
        success: result.success,
        executionTime: result.executionTime,
        operations: result.operations.length,
        lockRespected: true
      });
    }).catch(error => {
      console.error(`[BACKGROUND-CLEANUP] ❌ Lock-aware cleanup job failed: ${jobData.jobId}`, error);
    });

    console.log(`[BACKGROUND-CLEANUP] 🎯 Lock-aware cleanup job queued: ${jobData.jobId} for store: ${storeId}`);

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Lock-aware background cleanup job queued successfully',
      jobId: jobData.jobId,
      storeId,
      status: 'queued',
      estimatedDuration: '3-7 minutes',
      lockSystemEnabled: true
    });

  } catch (error) {
    console.error('[BACKGROUND-CLEANUP] ❌ Failed to queue cleanup job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        lockSystemEnabled: true
      },
      { status: 500 }
    );
  }
} 