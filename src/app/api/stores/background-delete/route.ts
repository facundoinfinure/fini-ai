import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundJobManager, createJobId, validateJobData, type VectorCleanupJob } from '@/lib/services/background-job-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      return NextResponse.json(
        { success: false, error: `Invalid job data: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute job asynchronously
    const jobManager = getBackgroundJobManager();
    
    // Fire-and-forget execution
    jobManager.handleVectorCleanup(jobData).then(result => {
      console.log(`[BACKGROUND-DELETE] ✅ Delete job completed: ${result.jobId}`, {
        success: result.success,
        executionTime: result.executionTime,
        operations: result.operations.length
      });
    }).catch(error => {
      console.error(`[BACKGROUND-DELETE] ❌ Delete job failed: ${jobData.jobId}`, error);
    });

    console.log(`[BACKGROUND-DELETE] 🎯 Delete job queued: ${jobData.jobId} for store: ${storeId}`);

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Background deletion job queued successfully',
      jobId: jobData.jobId,
      storeId,
      status: 'queued',
      estimatedDuration: '1-3 minutes'
    });

  } catch (error) {
    console.error('[BACKGROUND-DELETE] ❌ Failed to queue deletion job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 