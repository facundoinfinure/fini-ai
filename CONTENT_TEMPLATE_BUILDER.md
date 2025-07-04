# Twilio Content Template Builder API Integration

This document explains how to use the **Twilio Content Template Builder API** for managing WhatsApp message templates programmatically in the Fini AI application.

Based on: https://www.twilio.com/docs/content

## Overview

The Content Template Builder API allows you to:
- ✅ Create message templates programmatically 
- ✅ Submit templates for WhatsApp approval automatically
- ✅ Manage template lifecycle (create, update, delete)
- ✅ Generate environment variables dynamically
- ✅ Maintain consistent template versioning

## Quick Start

### 1. Set Up Credentials

Ensure your `.env.local` has Twilio credentials:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Create All Fini Templates

Use the management script to create all predefined templates:

```bash
# List existing templates
node scripts/manage-content-templates.js list

# Create all Fini AI templates at once
node scripts/manage-content-templates.js create-all

# Generate environment variables for .env.local
node scripts/manage-content-templates.js env-vars
```

### 3. Update Environment Variables

After creation, add the generated Content SIDs to your `.env.local`:

```bash
# WhatsApp Content Template SIDs (Generated by Content Template Builder API)
TWILIO_OTP_CONTENTSID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WELCOME_CONTENTSID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_ANALYTICS_CONTENTSID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_MARKETING_CONTENTSID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_ERROR_CONTENTSID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_CONTENTSID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Template Configurations & Content Types

### Content Type Selection Guide

Each template requires specific **Content Type** selection in Twilio console:

#### 🛡️ Authentication Templates (1 template)
- **Content Type**: `Authentication`
- **Use for**: OTP codes, verification messages
- **Auto-approval**: Yes, fastest delivery
- **Dynamic Fallback**: ❌ Not recommended (security critical)
- **Variables**: ❌ Not available (Twilio managed)

#### 📄 Text Templates (24 templates)  
- **Content Type**: `Text`
- **Use for**: Conversational messages with variables
- **Auto-approval**: Depends on content
- **Dynamic Fallback**: ✅ Recommended for better delivery
- **Variables**: ✅ Full control with `{{1}}`, `{{2}}`, etc.

### Multi-Agent System Templates (25 Total)

#### 🔐 **AUTHENTICATION CATEGORY**

**1. OTP Verification Template**
- **Name**: `fini_otp_verification_v4`
- **Content Type**: `🛡️ Authentication`
- **Category**: `AUTHENTICATION`  
- **Variables**: ❌ **Not available** (Twilio manages automatically)
- **Configuration**: 
  - Code Expiration Time: `10` minutes
  - Button Text: `Copiar Código`
- **Dynamic Fallback**: ❌ **Not needed** (security critical, direct delivery)
- **Use Case**: User phone verification with maximum reliability

**1b. OTP Custom Template (Alternative)**
- **Name**: `fini_otp_custom_v4` 
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = OTP Code, `{{2}}` = Expiry minutes
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Custom OTP messages with full control

#### 📊 **ANALYTICS AGENT TEMPLATES**

**2. Analytics Proactive Report**
- **Name**: `fini_analytics_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Sales, `{{3}}` = Orders, `{{4}}` = Trend
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_daily_summary_v4`
- **Use Case**: Proactive analytics reports

**3. Analytics Notification Alert**
- **Name**: `fini_analytics_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Metric affected, `{{2}}` = Change detected, `{{3}}` = Recommendation
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Performance alerts and notifications

#### 🎧 **CUSTOMER SERVICE AGENT TEMPLATES**

**4. Customer Service Proactive**
- **Name**: `fini_customer_service_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Pending queries, `{{3}}` = Avg response time
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Customer service status updates

**5. Customer Service Notification**
- **Name**: `fini_customer_service_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Customer name, `{{2}}` = Query type, `{{3}}` = Priority
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Urgent customer support alerts

#### 🚀 **MARKETING AGENT TEMPLATES**

**6. Marketing Proactive Opportunities**
- **Name**: `fini_marketing_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `MARKETING`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Opportunity detected, `{{3}}` = Impact potential
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Marketing opportunity alerts

**7. Marketing Trend Notification**
- **Name**: `fini_marketing_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `MARKETING`
- **Variables**: `{{1}}` = Trend detected, `{{2}}` = Recommended action, `{{3}}` = Time window
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_marketing_proactive_v4`
- **Use Case**: Time-sensitive marketing trends

#### 📦 **STOCK MANAGER AGENT TEMPLATES**

**8. Stock Manager Proactive**
- **Name**: `fini_stock_manager_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Low stock products, `{{3}}` = High movement products
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_stock_critical_alert_v4`
- **Use Case**: Inventory management insights

**9. Stock Critical Alert**
- **Name**: `fini_stock_critical_alert_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Product name, `{{2}}` = Remaining stock, `{{3}}` = Days until stockout
- **Dynamic Fallback**: ✅ **REQUIRED** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Critical stock shortage alerts

#### 💰 **FINANCIAL ADVISOR AGENT TEMPLATES**

**10. Financial Advisor Proactive**
- **Name**: `fini_financial_advisor_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Current margin, `{{3}}` = Main recommendation
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_daily_summary_v4`
- **Use Case**: Financial performance analysis

**11. Financial Advisor Notification**
- **Name**: `fini_financial_advisor_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Financial metric, `{{2}}` = Percentage change, `{{3}}` = Recommended action
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Financial alerts and recommendations

#### 🎯 **BUSINESS CONSULTANT AGENT TEMPLATES**

**12. Business Consultant Proactive**
- **Name**: `fini_business_consultant_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Strategic opportunity, `{{3}}` = Next suggested step
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Strategic business insights

**13. Business Consultant Notification**
- **Name**: `fini_business_consultant_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Strategic insight, `{{2}}` = Business impact, `{{3}}` = Urgency level
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Strategic alerts and insights

#### 🛍️ **PRODUCT MANAGER AGENT TEMPLATES**

**14. Product Manager Proactive**
- **Name**: `fini_product_manager_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Featured product, `{{3}}` = Optimization opportunity
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_daily_summary_v4`
- **Use Case**: Product catalog optimization

**15. Product Manager Notification**
- **Name**: `fini_product_manager_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Product or category, `{{2}}` = Change detected, `{{3}}` = Suggested action
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Product performance alerts

#### ⚙️ **OPERATIONS MANAGER AGENT TEMPLATES**

**16. Operations Manager Proactive**
- **Name**: `fini_operations_manager_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Process to optimize, `{{3}}` = Estimated savings
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Operational efficiency insights

**17. Operations Manager Notification**
- **Name**: `fini_operations_manager_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Inefficient process detected, `{{2}}` = Cost impact, `{{3}}` = Proposed solution
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Process optimization alerts

#### 🏆 **SALES COACH AGENT TEMPLATES**

**18. Sales Coach Proactive**
- **Name**: `fini_sales_coach_proactive_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Current conversion rate, `{{3}}` = Improvement opportunity
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_daily_summary_v4`
- **Use Case**: Sales performance coaching

**19. Sales Coach Notification**
- **Name**: `fini_sales_coach_notification_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Sales opportunity detected, `{{2}}` = Revenue potential, `{{3}}` = Suggested strategy
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_error_fallback_v4`
- **Use Case**: Sales opportunity alerts

#### 🔄 **SYSTEM COORDINATION TEMPLATES**

**20. Context Switch**
- **Name**: `fini_context_switch_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Previous agent, `{{2}}` = New specialist agent, `{{3}}` = Transition summary
- **Dynamic Fallback**: ✅ **REQUIRED** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Agent-to-agent handoffs

**21. Multi-Agent Query Coordination**
- **Name**: `fini_multi_agent_query_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Specialists involved, `{{2}}` = Main query topic, `{{3}}` = Coordination plan
- **Dynamic Fallback**: ✅ **REQUIRED** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Complex multi-agent responses

**22. Welcome Multi-Agent System**
- **Name**: `fini_welcome_multi_agent_v4`
- **Content Type**: `📄 Text`
- **Category**: `MARKETING`
- **Variables**: `{{1}}` = User name, `{{2}}` = Store name
- **Dynamic Fallback**: ❌ **Not needed** (primary fallback for others)
- **Use Case**: System introduction and agent overview

**23. Error Fallback**
- **Name**: `fini_error_fallback_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Error type or problem, `{{2}}` = Suggested alternative
- **Dynamic Fallback**: ❌ **Not needed** (final fallback template)
- **Use Case**: Error handling and recovery

**24. Daily Summary**
- **Name**: `fini_daily_summary_v4`
- **Content Type**: `📄 Text`
- **Category**: `UTILITY`
- **Variables**: `{{1}}` = Store name, `{{2}}` = Daily sales, `{{3}}` = Daily orders, `{{4}}` = Top product
- **Dynamic Fallback**: ✅ **Recommended** → Fallback to `fini_welcome_multi_agent_v4`
- **Use Case**: Automated daily business summaries

## Dynamic Fallback Configuration Guide

### 🎯 **When to Use Dynamic Fallback**

#### ✅ **RECOMMENDED for:**
- **Marketing templates** → Better delivery rates
- **Notification templates** → Critical alerts need backup
- **Agent coordination** → System reliability
- **Proactive messages** → User engagement

#### ❌ **NOT RECOMMENDED for:**
- **Authentication templates** → Security concerns
- **Primary fallback templates** → Would create loops
- **Error handling templates** → Final fallback point

### 🛠️ **How to Configure Dynamic Fallback**

When creating each template in Twilio console:

1. **After template creation**, click "Edit"
2. **Scroll to "Dynamic Fallback"** section
3. **Select "Enable Dynamic Fallback"**
4. **Choose fallback template** from the dropdown
5. **Set priority ranking** (Rich ranking 1-8)

### 📊 **Fallback Chain Strategy**

```
┌─────────────────────┐
│ Specialist Agent    │
│ Template            │
└─────────┬───────────┘
          │ FAILS
          ▼
┌─────────────────────┐
│ General Purpose     │
│ Template            │
└─────────┬───────────┘
          │ FAILS
          ▼
┌─────────────────────┐
│ Welcome Multi-Agent │
│ (Primary Fallback)  │
└─────────┬───────────┘
          │ FAILS
          ▼
┌─────────────────────┐
│ Error Fallback      │
│ (Final Fallback)    │
└─────────────────────┘
```

### 🎨 **Fallback Template Mappings**

| **Template Category** | **Primary Fallback** | **Secondary Fallback** |
|----------------------|---------------------|----------------------|
| Analytics Templates | `fini_daily_summary_v4` | `fini_welcome_multi_agent_v4` |
| Customer Service | `fini_welcome_multi_agent_v4` | `fini_error_fallback_v4` |
| Marketing Templates | `fini_welcome_multi_agent_v4` | `fini_marketing_proactive_v4` |
| Stock Management | `fini_stock_critical_alert_v4` | `fini_error_fallback_v4` |
| Financial Templates | `fini_daily_summary_v4` | `fini_error_fallback_v4` |
| Business Consulting | `fini_welcome_multi_agent_v4` | `fini_error_fallback_v4` |
| Product Management | `fini_daily_summary_v4` | `fini_error_fallback_v4` |
| Operations | `fini_welcome_multi_agent_v4` | `fini_error_fallback_v4` |
| Sales Coaching | `fini_daily_summary_v4` | `fini_error_fallback_v4` |
| System Coordination | `fini_welcome_multi_agent_v4` | `fini_error_fallback_v4` |
| OTP Custom | `fini_error_fallback_v4` | N/A |

## WhatsApp Template Approval Process

### Approval Categories

- **AUTHENTICATION**: OTP and verification messages
- **MARKETING**: Promotional and welcome messages  
- **UTILITY**: Analytics, summaries, and support messages

### Approval Timeline

- **Automatic approval**: Some utility templates
- **Manual review**: Marketing templates (24-48 hours)
- **Complex approval**: Custom promotional content

### Checking Approval Status

1. Visit [Twilio Console - Content Template Builder](https://console.twilio.com/us1/develop/sms/content-template-builder)
2. Check template status: `APPROVED`, `PENDING`, `REJECTED`, or `DRAFT`
3. Monitor approval requests in the console

## Integration with Existing WhatsApp Service

The templates are automatically integrated with the existing `TwilioWhatsAppService`:

```typescript
// Templates are now managed via Content Template Builder API
import { WHATSAPP_TEMPLATES } from '@/lib/integrations/twilio-whatsapp';

// Send a template message
await twilioService.sendTemplateByType(phoneNumber, 'welcome', {
  displayName: 'Usuario',
  storeName: 'Mi Tienda'
});
```

### Smart Template Fallback

The system maintains smart fallback logic:

1. **Try freeform message** (works within 24h window)
2. **Detect error 63016** (outside 24h window)
3. **Automatically select appropriate template**
4. **Send using contentSid + contentVariables**

## Template Versioning

### Version Strategy

- Templates use `v3` suffix for latest Content Template Builder API version
- Previous versions (`v1`, `v2`) maintain backward compatibility
- Environment variables automatically point to latest versions

### Updating Templates

To update template content:

1. Create new version: `fini_template_name_v4`
2. Submit for approval
3. Update environment variables after approval
4. Deploy with new Content SIDs

## Best Practices

### Template Design

1. **Keep it concise**: WhatsApp has character limits
2. **Use emojis sparingly**: Enhance readability without overuse
3. **Clear variable names**: Use descriptive placeholders
4. **Test thoroughly**: Verify all variable combinations

### Variable Management

1. **Consistent naming**: Use numbered variables (`{{1}}`, `{{2}}`, etc.)
2. **Document variables**: Comment expected values and formats
3. **Validate inputs**: Ensure variables match template expectations
4. **Handle empty values**: Provide defaults for optional variables

### Security Considerations

1. **Environment variables**: Never expose Content SIDs in client-side code
2. **API access**: Protect template management APIs with authentication
3. **Rate limiting**: Implement rate limits for template creation
4. **Audit logs**: Monitor template usage and modifications

## Troubleshooting

### Common Issues

#### 1. Template Creation Fails
```
Error: Property 'create' does not exist on type 'ContentListInstance'
```
**Solution**: Update Twilio SDK version or use the management script instead of TypeScript API.

#### 2. Approval Request Fails
```
Error: Template not found for approval
```
**Solution**: Ensure template exists before submitting for approval. Check Content SID.

#### 3. Variable Mismatch
```
Error: Template variables do not match provided variables
```
**Solution**: Verify variable count and naming convention (`{{1}}`, `{{2}}`, etc.).

### Debugging Commands

```bash
# Check template status
node scripts/manage-content-templates.js list

# Verify credentials
node scripts/check-env.js

# Test template creation manually
curl -X GET http://localhost:3000/api/whatsapp/content-builder
```

### Logs to Monitor

- `[CONTENT_API]` - Template creation and management
- `[CONTENT_BUILDER]` - API route operations
- `[WHATSAPP]` - Message sending with templates
- `[ERROR]` - Failed operations and errors

## Migration from Manual Templates

If migrating from manually created templates:

1. **Export existing Content SIDs** from Twilio Console
2. **Update environment variables** to match new template names
3. **Test template sending** with existing WhatsApp service
4. **Gradually migrate** to Content Template Builder API management

## Support and Resources

- **Twilio Docs**: https://www.twilio.com/docs/content
- **Console**: https://console.twilio.com/us1/develop/sms/content-template-builder
- **API Reference**: https://www.twilio.com/docs/content/api
- **Fini AI Integration**: Check `src/lib/integrations/twilio-content-templates.ts`

---

## Quick Reference

### Environment Variables
```bash
TWILIO_ACCOUNT_SID=          # Your Twilio Account SID
TWILIO_AUTH_TOKEN=           # Your Twilio Auth Token
TWILIO_PHONE_NUMBER=         # WhatsApp Business number
TWILIO_OTP_CONTENTSID=       # OTP template Content SID
TWILIO_WELCOME_CONTENTSID=   # Welcome template Content SID
TWILIO_ANALYTICS_CONTENTSID= # Analytics template Content SID
TWILIO_MARKETING_CONTENTSID= # Marketing template Content SID
TWILIO_ERROR_CONTENTSID=     # Error template Content SID
TWILIO_DAILY_SUMMARY_CONTENTSID= # Daily summary template Content SID
```

### Key Files
- `src/lib/integrations/twilio-content-templates.ts` - Template service
- `src/app/api/whatsapp/content-builder/route.ts` - API routes
- `scripts/manage-content-templates.js` - Management CLI
- `src/lib/integrations/twilio-whatsapp.ts` - WhatsApp integration

### CLI Commands
```bash
node scripts/manage-content-templates.js list        # List templates
node scripts/manage-content-templates.js create-all  # Create all templates
node scripts/manage-content-templates.js env-vars    # Generate env vars
``` 