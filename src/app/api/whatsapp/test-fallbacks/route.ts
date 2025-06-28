import { NextRequest, NextResponse } from 'next/server';
import { smartTemplateService } from '@/lib/integrations/whatsapp/smart-template-service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TestFallbacks');

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, storeId, testType } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    logger.info('Testing fallback system', { phoneNumber, storeId, testType });

    switch (testType) {
      case 'stats':
        const stats = await smartTemplateService.getServiceStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'debug':
        const debugInfo = await smartTemplateService.getTemplateDebugInfo();
        return NextResponse.json({
          success: true,
          data: debugInfo
        });

      case 'fallback-test':
        const fallbackResults = await smartTemplateService.testFallbackSystem(
          phoneNumber,
          storeId || 'test-store'
        );
        return NextResponse.json({
          success: true,
          data: fallbackResults
        });

      case 'single-template':
        const { agentType, messageType, variables } = await request.json();
        
        if (!agentType || !messageType) {
          return NextResponse.json(
            { error: 'agentType and messageType are required for single-template test' },
            { status: 400 }
          );
        }

        const context = {
          phoneNumber,
          storeId: storeId || 'test-store',
          userId: 'test-user',
          lastMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // Force template usage
        };

        const testVariables = variables || {
          '1': 'Test Store',
          '2': 'Test Data',
          '3': 'Test Value',
          '4': 'Extra Test Data'
        };

        const result = await smartTemplateService.sendSmartAgentMessage(
          context,
          agentType,
          messageType,
          testVariables,
          'Fallback freeform message for testing'
        );

        return NextResponse.json({
          success: true,
          data: result
        });

      default:
        return NextResponse.json(
          { error: 'Invalid testType. Use: stats, debug, fallback-test, or single-template' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Test fallbacks failed', { error: error instanceof Error ? error.message : error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // GET request returns service stats and debug info
    const [stats, debugInfo] = await Promise.all([
      smartTemplateService.getServiceStats(),
      smartTemplateService.getTemplateDebugInfo()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        debugInfo,
        usage: {
          endpoints: {
            'POST /api/whatsapp/test-fallbacks': 'Test specific functionality',
            'GET /api/whatsapp/test-fallbacks': 'Get service stats and debug info'
          },
          testTypes: {
            'stats': 'Get service statistics',
            'debug': 'Get template debug information',
            'fallback-test': 'Test fallback system with sample messages',
            'single-template': 'Test a specific agent/messageType combination'
          },
          examples: {
            stats: 'POST { "testType": "stats" }',
            debug: 'POST { "testType": "debug" }',
            fallbackTest: 'POST { "testType": "fallback-test", "phoneNumber": "+5491123456789", "storeId": "store-123" }',
            singleTemplate: 'POST { "testType": "single-template", "phoneNumber": "+5491123456789", "agentType": "analytics", "messageType": "proactive", "variables": { "1": "Mi Tienda", "2": "$1000", "3": "5", "4": "↗️ +10%" } }'
          }
        }
      }
    });

  } catch (error) {
    logger.error('GET test fallbacks failed', { error: error instanceof Error ? error.message : error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 