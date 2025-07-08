import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundJobManager, createJobId, validateJobData, type CleanupSyncJob } from '@/lib/services/background-job-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Execute job asynchronously
    const jobManager = getBackgroundJobManager();
    
    // Fire-and-forget execution
    jobManager.handleCleanupSync(jobData).then(result => {
      console.log(`[BACKGROUND-CLEANUP] ✅ Cleanup job completed: ${result.jobId}`, {
        success: result.success,
        executionTime: result.executionTime,
        operations: result.operations.length
      });
    }).catch(error => {
      console.error(`[BACKGROUND-CLEANUP] ❌ Cleanup job failed: ${jobData.jobId}`, error);
    });

    console.log(`[BACKGROUND-CLEANUP] 🎯 Cleanup job queued: ${jobData.jobId} for store: ${storeId}`);

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Background cleanup job queued successfully',
      jobId: jobData.jobId,
      storeId,
      status: 'queued',
      estimatedDuration: '3-7 minutes'
    });

  } catch (error) {
    console.error('[BACKGROUND-CLEANUP] ❌ Failed to queue cleanup job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 