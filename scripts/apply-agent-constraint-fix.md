# Fix Agent Type Constraint - Manual Instructions

## Problem
Chat is failing with error: `new row for relation "messages" violates check constraint "messages_agent_type_check"`

The current constraint only allows: `'orchestrator', 'analytics', 'customer_service', 'marketing'`
But the multi-agent system needs: `'product_manager', 'stock_manager', 'financial_advisor', 'business_consultant', 'operations_manager', 'sales_coach'`

## Solution

### Step 1: Go to Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Fini AI**
3. Click on **SQL Editor** in the left sidebar

### Step 2: Execute Migration SQL
Copy and paste this SQL in the SQL Editor and click **RUN**:

```sql
-- Migration: Update agent_type constraint to include all new agent types
-- Date: 2025-06-28
-- Execute this SQL in Supabase SQL Editor:

-- Drop existing constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_agent_type_check;

-- Add updated constraint with all agent types
ALTER TABLE public.messages ADD CONSTRAINT messages_agent_type_check 
  CHECK (agent_type IN (
    'orchestrator', 
    'analytics', 
    'customer_service', 
    'marketing', 
    'stock_manager', 
    'financial_advisor', 
    'business_consultant', 
    'product_manager', 
    'operations_manager', 
    'sales_coach'
  ));
```

### Step 3: Verify Fix
After executing the SQL:

1. Go back to the chat at: https://fini-tn.vercel.app/dashboard?tab=chat
2. Try asking: "¿Qué producto es el más caro de mi tienda?"
3. The chat should now work without refreshing or errors

### Step 4: Check Results
- ✅ No more constraint violation errors in Vercel logs
- ✅ Chat messages save successfully to database  
- ✅ Product Manager agent can respond to product queries
- ✅ No more automatic page refresh on error

## What This Fixes

1. **Agent Type Constraint Error**: Allows all 10 agent types to save messages
2. **Store ID Error**: Frontend now passes real store UUID instead of 'current-store'
3. **Chat Refresh Issue**: Better error handling prevents automatic page refresh
4. **RAG System**: Proper store context for vector search

## Expected Behavior After Fix

When you ask "¿Qué producto es el más caro de mi tienda?":
- ✅ Routes to **Product Manager Agent** (95% confidence)
- ✅ Uses RAG to search your store's product data
- ✅ Saves both user message and agent response to database
- ✅ Shows response in chat without refresh

## Troubleshooting

If you still get errors after the migration:
1. Check Vercel logs for any remaining issues
2. Ensure your store is properly connected
3. Verify WhatsApp is configured (though chat works without it)
4. Try refreshing the page and testing again

## Files Modified
- ✅ `supabase/migrations/004_update_agent_types.sql` - Database migration
- ✅ `src/components/dashboard/chat-preview.tsx` - Use real store ID
- ✅ `src/components/chat/chat-dashboard-wrapper.tsx` - Pass store prop
- ✅ `src/app/api/chat/send/route.ts` - Updated for new agents

## Deploy Status
- ✅ **Frontend fixes deployed**: Commit `518fd12`
- ⏳ **Database migration**: Manual execution required (this step)
- 🎯 **Ready for testing**: After database migration 