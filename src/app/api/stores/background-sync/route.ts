import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundJobManager, createJobId, validateJobData, type NewStoreSyncJob } from '@/lib/services/background-job-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Execute job asynchronously
    const jobManager = getBackgroundJobManager();
    
    // Fire-and-forget execution
    jobManager.handleNewStoreSync(jobData).then(result => {
      console.log(`[BACKGROUND-SYNC] ✅ Job completed: ${result.jobId}`, {
        success: result.success,
        executionTime: result.executionTime,
        operations: result.operations.length
      });
    }).catch(error => {
      console.error(`[BACKGROUND-SYNC] ❌ Job failed: ${jobData.jobId}`, error);
    });

    console.log(`[BACKGROUND-SYNC] 🎯 Job queued: ${jobData.jobId} for store: ${storeId}`);

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Background sync job queued successfully',
      jobId: jobData.jobId,
      storeId,
      status: 'queued',
      estimatedDuration: '2-5 minutes'
    });

  } catch (error) {
    console.error('[BACKGROUND-SYNC] ❌ Failed to queue job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 