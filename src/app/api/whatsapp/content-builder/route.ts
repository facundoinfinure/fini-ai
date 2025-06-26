/**
 * API Route: Content Template Builder Integration
 * Based on: https://www.twilio.com/docs/content
 * 
 * GET    /api/whatsapp/content-builder - List all content templates
 * POST   /api/whatsapp/content-builder - Create new template from Fini config
 * DELETE /api/whatsapp/content-builder?sid=... - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * GET - List all content templates
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[CONTENT_BUILDER] GET /api/whatsapp/content-builder');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);
    const contents = await client.content.v1.contents.list({ limit: 50 });

    const templates = contents.map(content => ({
      sid: content.sid,
      friendlyName: content.friendlyName || 'Unknown',
      language: content.language || 'unknown',
      status: getApprovalStatus(content),
      createdAt: content.dateCreated?.toISOString() || '',
      updatedAt: content.dateUpdated?.toISOString() || ''
    }));

    console.log(`[CONTENT_BUILDER] Found ${templates.length} templates`);

    return NextResponse.json({
      success: true,
      data: {
        templates,
        count: templates.length
      }
    });

  } catch (error) {
    console.error('[ERROR] Content builder API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new content template
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CONTENT_BUILDER] POST /api/whatsapp/content-builder');

    const body = await request.json();
    const { templateType, friendlyName, content, variables } = body;

    if (!templateType || !friendlyName || !content) {
      return NextResponse.json(
        { success: false, error: 'templateType, friendlyName, and content are required' },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Create content template
    const contentTemplate = await client.content.v1.contents.create({
      friendlyName: friendlyName,
      language: 'es',
      variables: variables || {},
      types: {
        'twilio/text': {
          body: content
        }
      }
    });

    console.log(`[CONTENT_BUILDER] Template created: ${contentTemplate.sid}`);

    return NextResponse.json({
      success: true,
      data: {
        contentSid: contentTemplate.sid,
        friendlyName: friendlyName,
        templateType: templateType,
        message: 'Template created successfully'
      }
    });

  } catch (error) {
    console.error('[ERROR] Create template error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a content template
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[CONTENT_BUILDER] DELETE /api/whatsapp/content-builder');

    const { searchParams } = new URL(request.url);
    const contentSid = searchParams.get('sid');

    if (!contentSid) {
      return NextResponse.json(
        { success: false, error: 'Content SID is required' },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);
    await client.content.v1.contents(contentSid).remove();

    console.log(`[CONTENT_BUILDER] Template deleted: ${contentSid}`);

    return NextResponse.json({
      success: true,
      data: {
        contentSid,
        message: 'Template deleted successfully'
      }
    });

  } catch (error) {
    console.error('[ERROR] Delete template error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get approval status
 */
function getApprovalStatus(content: any): 'approved' | 'pending' | 'rejected' | 'draft' {
  if (!content.approvalRequests || content.approvalRequests.length === 0) {
    return 'draft';
  }
  const latestRequest = content.approvalRequests[content.approvalRequests.length - 1];
  return latestRequest.status || 'pending';
} 