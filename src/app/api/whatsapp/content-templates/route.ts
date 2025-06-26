/**
 * API Route: WhatsApp Content Templates Management
 * Using Twilio Content Template Builder API
 * 
 * GET    /api/whatsapp/content-templates - List all templates
 * POST   /api/whatsapp/content-templates - Create new template
 * PUT    /api/whatsapp/content-templates - Create all Fini templates
 * DELETE /api/whatsapp/content-templates - Delete template by SID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createContentTemplateService, FINI_TEMPLATE_CONFIGS } from '@/lib/integrations/twilio-content-templates';

/**
 * GET - List all content templates
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[CONTENT_API] GET /api/whatsapp/content-templates');

    const contentService = createContentTemplateService();
    const result = await contentService.listContentTemplates();

    if (!result.success) {
      console.error('[ERROR] Failed to list templates:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`[CONTENT_API] Successfully retrieved ${result.templates?.length} templates`);

    return NextResponse.json({
      success: true,
      data: {
        templates: result.templates,
        count: result.templates?.length || 0
      }
    });

  } catch (error) {
    console.error('[ERROR] Content templates API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new content template
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CONTENT_API] POST /api/whatsapp/content-templates');

    const body = await request.json();
    const { templateType, customConfig } = body;

    if (!templateType && !customConfig) {
      return NextResponse.json(
        { success: false, error: 'Either templateType or customConfig is required' },
        { status: 400 }
      );
    }

    const contentService = createContentTemplateService();

    let templateConfig;

    if (templateType && FINI_TEMPLATE_CONFIGS[templateType as keyof typeof FINI_TEMPLATE_CONFIGS]) {
      // Create predefined Fini template
      const finiConfig = FINI_TEMPLATE_CONFIGS[templateType as keyof typeof FINI_TEMPLATE_CONFIGS];
      templateConfig = {
        friendlyName: finiConfig.friendlyName,
        language: finiConfig.language,
        variables: finiConfig.variables,
        types: {
          'twilio/text': {
            body: finiConfig.content.body
          }
        }
      };
    } else if (customConfig) {
      // Create custom template
      templateConfig = customConfig;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid template configuration' },
        { status: 400 }
      );
    }

    // Create the template
    const createResult = await contentService.createContentTemplate(templateConfig);

    if (!createResult.success) {
      console.error('[ERROR] Failed to create template:', createResult.error);
      return NextResponse.json(
        { success: false, error: createResult.error },
        { status: 500 }
      );
    }

    // If it's a Fini template, submit for WhatsApp approval
    let approvalResult;
    if (templateType && FINI_TEMPLATE_CONFIGS[templateType as keyof typeof FINI_TEMPLATE_CONFIGS]) {
      const finiConfig = FINI_TEMPLATE_CONFIGS[templateType as keyof typeof FINI_TEMPLATE_CONFIGS];
      
      approvalResult = await contentService.submitForWhatsAppApproval({
        name: finiConfig.friendlyName,
        category: finiConfig.category,
        contentSid: createResult.contentSid!,
        allow_category_change: false
      });
    }

    console.log(`[CONTENT_API] Template created successfully: ${createResult.contentSid}`);

    return NextResponse.json({
      success: true,
      data: {
        contentSid: createResult.contentSid,
        templateType,
        approvalRequestSid: approvalResult?.approvalRequestSid,
        submittedForApproval: !!approvalResult?.success
      }
    });

  } catch (error) {
    console.error('[ERROR] Create template API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Create all Fini AI templates at once
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('[CONTENT_API] PUT /api/whatsapp/content-templates - Creating all Fini templates');

    const contentService = createContentTemplateService();
    const result = await contentService.createAllFiniTemplates();

    console.log(`[CONTENT_API] Bulk template creation result:`, result.summary);

    return NextResponse.json({
      success: result.success,
      data: {
        results: result.results,
        summary: result.summary,
        message: `Created ${result.summary.created} templates, submitted ${result.summary.submitted} for approval, ${result.summary.failed} failed`
      }
    });

  } catch (error) {
    console.error('[ERROR] Bulk create templates API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a content template by SID
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[CONTENT_API] DELETE /api/whatsapp/content-templates');

    const { searchParams } = new URL(request.url);
    const contentSid = searchParams.get('sid');

    if (!contentSid) {
      return NextResponse.json(
        { success: false, error: 'Content SID is required' },
        { status: 400 }
      );
    }

    const contentService = createContentTemplateService();
    const result = await contentService.deleteTemplate(contentSid);

    if (!result.success) {
      console.error('[ERROR] Failed to delete template:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`[CONTENT_API] Template deleted successfully: ${contentSid}`);

    return NextResponse.json({
      success: true,
      data: {
        contentSid,
        message: 'Template deleted successfully'
      }
    });

  } catch (error) {
    console.error('[ERROR] Delete template API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 