import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundJobManager, createJobId, validateJobData, type NewStoreSyncJob } from '@/lib/services/background-job-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[BACKGROUND-SYNC] 🚀 Background sync job received');
    
    const body = await request.json();
    const { storeId, accessToken, userId, syncType, priority, includeVectors, includeDatabase, jobId } = body;

    // Validate required fields
    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' }, 
        { status: 400 }
      );
    }

    // 🔒 STEP 1: Check for lock conflicts before starting
    try {
      const { checkRAGLockConflicts, RAGLockType } = await import('@/lib/rag/global-locks');
      
      const conflictCheck = await checkRAGLockConflicts(storeId, RAGLockType.BACKGROUND_SYNC);
      
      if (!conflictCheck.canProceed) {
        console.warn(`[BACKGROUND-SYNC] ⏳ Cannot start background sync for store ${storeId} - ${conflictCheck.reason}`);
        
        return NextResponse.json({
          success: false,
          error: 'Background sync blocked by higher priority operation',
          details: conflictCheck.reason,
          conflictingOperations: conflictCheck.conflictingLocks?.map(lock => ({
            type: lock.type,
            operation: lock.operation,
            ageMs: Date.now() - lock.timestamp
          })) || []
        }, { status: 409 }); // Conflict status
      }
    } catch (lockError) {
      console.warn('[BACKGROUND-SYNC] ⚠️ Lock check failed, proceeding with caution:', lockError);
      // Continue execution but log the warning
    }

    // Create job data
    const jobData: NewStoreSyncJob = {
      jobId: jobId || createJobId('new_store_sync', storeId),
      storeId,
      userId,
      type: 'new_store_sync',
      timestamp: new Date().toISOString(),
      priority: priority || 'high',
      accessToken,
      includeVectors: includeVectors !== false, // Default true
      includeDatabase: includeDatabase !== false, // Default true
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
    
    // 🔒 STEP 2: Execute job with lock-aware enhanced background job manager
    jobManager.handleNewStoreSync(jobData).then(result => {
      console.log(`[BACKGROUND-SYNC] ✅ Lock-aware job completed: ${result.jobId}`, {
        success: result.success,
        executionTime: result.executionTime,
        operations: result.operations.length,
        lockRespected: true
      });
    }).catch(error => {
      console.error(`[BACKGROUND-SYNC] ❌ Lock-aware job failed: ${jobData.jobId}`, error);
    });

    console.log(`[BACKGROUND-SYNC] 🎯 Lock-aware job queued: ${jobData.jobId} for store: ${storeId}`);

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Lock-aware background sync job queued successfully',
      jobId: jobData.jobId,
      storeId,
      status: 'queued',
      estimatedDuration: '2-5 minutes',
      lockSystemEnabled: true
    });

  } catch (error) {
    console.error('[BACKGROUND-SYNC] ❌ Failed to queue lock-aware job:', error);
    
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