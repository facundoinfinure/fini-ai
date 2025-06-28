# WhatsApp Template Fallback System

## Overview

Since Twilio's Dynamic Fallback feature couldn't be configured during template creation, we implemented a **programmatic fallback system** directly in the SmartTemplateService. This ensures reliable message delivery even when primary templates fail.

## How It Works

### 1. Template Hierarchy

```
Primary Template → Fallback Template → ERROR_FALLBACK (final resort)
```

### 2. Fallback Chain Configuration

The system uses a predefined fallback chain in `TEMPLATE_FALLBACK_CHAIN`:

```typescript
// Agent Proactive Templates → Daily Summary or Welcome
'ANALYTICS_PROACTIVE': 'DAILY_SUMMARY',
'CUSTOMER_SERVICE_PROACTIVE': 'WELCOME_MULTI_AGENT',
'MARKETING_PROACTIVE': 'WELCOME_MULTI_AGENT',

// Agent Notification Templates → Error Fallback
'ANALYTICS_NOTIFICATION': 'ERROR_FALLBACK',
'CUSTOMER_SERVICE_NOTIFICATION': 'ERROR_FALLBACK',

// System Coordination Templates → Welcome
'CONTEXT_SWITCH': 'WELCOME_MULTI_AGENT',
'MULTI_AGENT_QUERY': 'WELCOME_MULTI_AGENT',
```

### 3. ContentSID Environment Variables

Each template maps to a specific environment variable in Vercel:

```bash
TWILIO_ANALYTICS_PROACTIVE_CONTENTSID=HXca74430b547d3bb05665960af0a84714
TWILIO_ANALYTICS_NOTIFICATION_CONTENTSID=HXcee5158ef3aae029c563b7356ec3727a
TWILIO_CUSTOMER_SERVICE_PROACTIVE_CONTENTSID=HX4e9396f648d74d0a04d738f0eb15b67d
# ... (24 total templates)
```

## Automatic Fallback Logic

### 1. Primary Template Attempt

1. **Get ContentSID** from environment variable
2. **Map variables** according to template configuration
3. **Send via Twilio API** using ContentSID

### 2. Fallback on Failure

If primary template fails:

1. **Look up fallback** template in `TEMPLATE_FALLBACK_CHAIN`
2. **Prepare appropriate variables** for fallback template
3. **Send fallback template** with adapted variables
4. **Log fallback usage** for monitoring

### 3. Final Resort (ERROR_FALLBACK)

If fallback also fails:

1. **Use ERROR_FALLBACK** template as final resort
2. **Generic error variables** with system unavailable message
3. **Log critical failure** for immediate attention

## Variable Adaptation

The system intelligently adapts variables for different fallback templates:

### Welcome Template Fallback
```typescript
// Original: Analytics variables
{ '1': 'TiendaEjemplo', '2': '$1000', '3': '5', '4': '↗️ +15%' }

// Adapted for WELCOME_MULTI_AGENT
{ '1': 'TiendaEjemplo', '2': 'TiendaEjemplo' }
```

### Error Fallback
```typescript
// Always uses generic error message
{ 
  '1': 'Sistema temporalmente no disponible',
  '2': 'Intentar nuevamente o contactar soporte'
}
```

## Testing Endpoints

### Test Fallback System

```bash
# Get service stats and debug info
GET /api/whatsapp/test-fallbacks

# Test specific functionality
POST /api/whatsapp/test-fallbacks
{
  "testType": "stats",
  "phoneNumber": "+5491123456789"
}
```

### Test Types Available

1. **`stats`** - Service statistics and missing ContentSIDs
2. **`debug`** - Template mappings and environment variables
3. **`fallback-test`** - Test fallback system with sample messages
4. **`single-template`** - Test specific agent/messageType combination

### Example: Test Single Template

```bash
POST /api/whatsapp/test-fallbacks
{
  "testType": "single-template",
  "phoneNumber": "+5491123456789",
  "agentType": "analytics",
  "messageType": "proactive",
  "variables": {
    "1": "Mi Tienda",
    "2": "$1000",
    "3": "5",
    "4": "↗️ +10%"
  }
}
```

## Monitoring & Debugging

### Service Stats Response

```json
{
  "templatesAvailable": 24,
  "agentsSupported": 9,
  "fallbackChainLength": 18,
  "missingContentSids": []
}
```

### Debug Info Response

```json
{
  "templateMappings": {
    "ANALYTICS_PROACTIVE": "TWILIO_ANALYTICS_PROACTIVE_CONTENTSID"
  },
  "fallbackChain": {
    "ANALYTICS_PROACTIVE": "DAILY_SUMMARY"
  },
  "environmentVariables": {
    "TWILIO_ANALYTICS_PROACTIVE_CONTENTSID": true,
    "TWILIO_MARKETING_PROACTIVE_CONTENTSID": false
  }
}
```

## Error Handling

### 1. Missing ContentSID
- **Error**: `ContentSID not found in environment variable: TWILIO_X_CONTENTSID`
- **Action**: Check Vercel environment variables

### 2. Template Configuration Missing
- **Error**: `No environment variable mapping found for template key: X`
- **Action**: Add template to `CONTENT_SID_ENV_MAPPING`

### 3. All Templates Fail
- **Error**: `All templates failed including error fallback`
- **Action**: Check Twilio service status and ContentSID validity

## Benefits

✅ **Automatic Recovery** - No manual intervention needed
✅ **Graceful Degradation** - Always provides fallback message  
✅ **Detailed Logging** - Track fallback usage and failures
✅ **Testing Support** - Comprehensive testing endpoints
✅ **Environment Validation** - Check missing ContentSIDs

## Production Readiness

- **24 Templates Created** ✅
- **ContentSIDs in Vercel** ✅  
- **Fallback Logic Implemented** ✅
- **Testing Endpoints Available** ✅
- **Error Monitoring** ✅

The system is now production-ready with reliable failover capabilities for all WhatsApp template scenarios. 