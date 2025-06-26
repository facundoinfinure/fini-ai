/**
 * Twilio Content Template Builder API Integration
 * Based on: https://www.twilio.com/docs/content
 */

import twilio from 'twilio';

export interface ContentTemplateConfig {
  friendlyName: string;
  language: string;
  variables?: Record<string, string>;
  types: {
    'twilio/text': {
      body: string;
    };
  };
}

export interface WhatsAppApprovalRequest {
  name: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  contentSid: string;
  allow_category_change?: boolean;
}

export interface TemplateStatus {
  sid: string;
  friendlyName: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected' | 'draft';
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export const FINI_TEMPLATE_CONFIGS = {
  OTP_VERIFICATION: {
    friendlyName: 'fini_otp_verification_v2',
    language: 'es',
    category: 'AUTHENTICATION' as const,
    variables: {
      '1': 'Código OTP (6 dígitos)',
      '2': 'Minutos de expiración'
    },
    content: {
      body: '🔐 *Código de Verificación Fini AI*\n\nTu código es: {{1}}\n\n⏰ Expira en {{2}} minutos.\n\n⚠️ No compartas este código.'
    }
  }
} as const;

export class TwilioContentTemplateService {
  private client: twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  async createContentTemplate(config: ContentTemplateConfig) {
    try {
      console.log(`[CONTENT_API] Creating template: ${config.friendlyName}`);

      // Note: Using HTTP API directly since SDK create method isn't available in current version
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const formData = new URLSearchParams({
        FriendlyName: config.friendlyName,
        Language: config.language,
        'Types[twilio/text][body]': config.types['twilio/text'].body
      });

      // Add variables if provided
      if (config.variables) {
        Object.entries(config.variables).forEach(([key, value]) => {
          formData.append(`Variables[${key}]`, value);
        });
      }

      const response = await fetch(`https://content.twilio.com/v1/Content`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const content = await response.json();

      return {
        success: true,
        contentSid: content.sid
      };
    } catch (error) {
      console.error('[ERROR] Failed to create content template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async submitForWhatsAppApproval(request: WhatsAppApprovalRequest) {
    try {
      console.log(`[CONTENT_API] Submitting for WhatsApp approval: ${request.name}`);

      // Note: Using HTTP API directly since SDK approval methods aren't available in current version
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const formData = new URLSearchParams({
        Name: request.name,
        Category: request.category,
        AllowCategoryChange: (request.allow_category_change || false).toString()
      });

      const response = await fetch(`https://content.twilio.com/v1/Content/${request.contentSid}/ApprovalRequests`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const approvalRequest = await response.json();

      return {
        success: true,
        approvalRequestSid: approvalRequest.sid
      };
    } catch (error) {
      console.error('[ERROR] Failed to submit for approval:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listContentTemplates() {
    try {
      console.log('[CONTENT_API] Fetching all content templates...');
      const contents = await this.client.content.v1.contents.list({ limit: 50 });
      
      const templates: TemplateStatus[] = contents.map(content => ({
        sid: content.sid,
        friendlyName: content.friendlyName || 'Unknown',
        language: content.language || 'unknown',
        status: this.getApprovalStatus(content),
        variables: content.variables || {},
        createdAt: content.dateCreated?.toISOString() || '',
        updatedAt: content.dateUpdated?.toISOString() || ''
      }));

      return { success: true, templates };
    } catch (error) {
      console.error('[ERROR] Failed to list templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a content template
   */
  async deleteTemplate(contentSid: string) {
    try {
      console.log(`[CONTENT_API] Deleting template: ${contentSid}`);

      await this.client.content.v1.contents(contentSid).remove();

      console.log(`[CONTENT_API] Template deleted successfully`);

      return { success: true };
    } catch (error) {
      console.error('[ERROR] Failed to delete template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create all Fini AI templates at once
   */
  async createAllFiniTemplates() {
    console.log('[CONTENT_API] Creating all Fini AI templates...');

    const results: Record<string, { contentSid?: string; error?: string; approvalSid?: string }> = {};
    let created = 0;
    let failed = 0;
    let submitted = 0;

    for (const [templateKey, templateConfig] of Object.entries(FINI_TEMPLATE_CONFIGS)) {
      try {
        // Create content template
        const contentResult = await this.createContentTemplate({
          friendlyName: templateConfig.friendlyName,
          language: templateConfig.language,
          variables: templateConfig.variables,
          types: {
            'twilio/text': {
              body: templateConfig.content.body
            }
          }
        });

        if (contentResult.success && contentResult.contentSid) {
          results[templateKey] = { contentSid: contentResult.contentSid };
          created++;

          // Submit for WhatsApp approval
          const approvalResult = await this.submitForWhatsAppApproval({
            name: templateConfig.friendlyName,
            category: templateConfig.category,
            contentSid: contentResult.contentSid,
            allow_category_change: false
          });

          if (approvalResult.success && approvalResult.approvalRequestSid) {
            results[templateKey].approvalSid = approvalResult.approvalRequestSid;
            submitted++;
          }

          // Wait a bit between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } else {
          results[templateKey] = { error: contentResult.error };
          failed++;
        }

      } catch (error) {
        results[templateKey] = { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        failed++;
      }
    }

    console.log(`[CONTENT_API] Template creation complete: ${created} created, ${failed} failed, ${submitted} submitted for approval`);

    return {
      success: failed === 0,
      results,
      summary: { created, failed, submitted }
    };
  }

  private getApprovalStatus(content: any): 'approved' | 'pending' | 'rejected' | 'draft' {
    if (!content.approvalRequests || content.approvalRequests.length === 0) {
      return 'draft';
    }
    const latestRequest = content.approvalRequests[content.approvalRequests.length - 1];
    return latestRequest.status || 'pending';
  }
}

export function createContentTemplateService(): TwilioContentTemplateService {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  }

  return new TwilioContentTemplateService(accountSid, authToken);
}
