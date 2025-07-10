import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundJobManager, createJobId, validateJobData, type VectorCleanupJob } from '@/lib/services/background-job-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[BACKGROUND-DELETE] 🗑️ Background deletion job received');
    
    const body = await request.json();
    const { storeId, userId, operation, priority, jobId } = body;

    // Validate required fields
    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' }, 
        { status: 400 }
      );
    }

    // 🔒 STEP 1: Acquire deletion lock (highest priority) before starting
    let lockProcessId: string | null = null;
    
    try {
      const { StoreDeletionLocks } = await import('@/lib/rag/global-locks');
      
      const lockResult = await StoreDeletionLocks.acquire(storeId, 'Background vector cleanup/deletion');
      
      if (!lockResult.success) {
        console.warn(`[BACKGROUND-DELETE] ❌ Cannot acquire deletion lock for store ${storeId}: ${lockResult.error}`);
        
        return NextResponse.json({
          success: false,
          error: 'Cannot acquire deletion lock',
          details: lockResult.error,
          reason: 'Another deletion operation may already be in progress'
        }, { status: 409 }); // Conflict status
      }
      
      lockProcessId = lockResult.processId!;
      console.log(`[BACKGROUND-DELETE] 🔒 Deletion lock acquired for store ${storeId} (${lockProcessId})`);
      
    } catch (lockError) {
      console.error('[BACKGROUND-DELETE] ❌ Failed to acquire deletion lock:', lockError);
      
      return NextResponse.json({
        success: false,
        error: 'Lock system unavailable',
        details: lockError instanceof Error ? lockError.message : 'Unknown lock error'
      }, { status: 503 }); // Service unavailable
    }

    // Create job data
    const jobData: VectorCleanupJob = {
      jobId: jobId || createJobId('vector_cleanup', storeId),
      storeId,
      userId,
      type: 'vector_cleanup',
      timestamp: new Date().toISOString(),
      priority: priority || 'medium',
      operation: operation || 'delete',
      retryCount: 0,
      maxRetries: 2
    };

    // Validate job data
    const validation = validateJobData(jobData);
    if (!validation.valid) {
      // Release lock before returning error
      if (lockProcessId) {
        try {
          const { StoreDeletionLocks } = await import('@/lib/rag/global-locks');
          await StoreDeletionLocks.release(storeId, lockProcessId);
        } catch (unlockError) {
          console.warn('[BACKGROUND-DELETE] ⚠️ Failed to release lock after validation error:', unlockError);
        }
      }
      
      return NextResponse.json(
        { success: false, error: `Invalid job data: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Get job manager
    const jobManager = getBackgroundJobManager();
    
    // 🔒 STEP 2: Execute deletion job with proper lock management
    jobManager.handleVectorCleanup(jobData).then(result => {
      console.log(`[BACKGROUND-DELETE] ✅ Lock-aware delete job completed: ${result.jobId}`, {
        success: result.success,
        executionTime: result.executionTime,
        operations: result.operations.length,
        lockProcessId: lockProcessId
      });
      
      // Release deletion lock after completion
      if (lockProcessId) {
        import('@/lib/rag/global-locks').then(({ StoreDeletionLocks }) => {
          StoreDeletionLocks.release(storeId, lockProcessId!).catch(unlockError => {
            console.warn(`[BACKGROUND-DELETE] ⚠️ Failed to release lock after completion (${lockProcessId}):`, unlockError);
          });
        });
      }
      
    }).catch(error => {
      console.error(`[BACKGROUND-DELETE] ❌ Lock-aware delete job failed: ${jobData.jobId}`, error);
      
      // Release deletion lock after failure
      if (lockProcessId) {
        import('@/lib/rag/global-locks').then(({ StoreDeletionLocks }) => {
          StoreDeletionLocks.release(storeId, lockProcessId!).catch(unlockError => {
            console.warn(`[BACKGROUND-DELETE] ⚠️ Failed to release lock after failure (${lockProcessId}):`, unlockError);
          });
        });
      }
    });

    console.log(`[BACKGROUND-DELETE] 🎯 Lock-aware delete job queued: ${jobData.jobId} for store: ${storeId} (lock: ${lockProcessId})`);

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Lock-aware background deletion job queued successfully',
      jobId: jobData.jobId,
      storeId,
      status: 'queued',
      estimatedDuration: '1-3 minutes',
      lockSystemEnabled: true,
      deletionLockAcquired: true
    });

  } catch (error) {
    console.error('[BACKGROUND-DELETE] ❌ Failed to queue deletion job:', error);
    
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