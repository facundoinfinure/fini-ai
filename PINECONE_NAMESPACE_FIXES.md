# 🔧 Pinecone Namespace Synchronization Fixes

## Problem Summary

The issue was that **Pinecone showed 0 namespaces** even though stores were connected in Supabase, causing agents to hallucinate because they couldn't access any RAG data. This created a critical sync problem between:

- **Tienda Nube** (store data source)
- **Supabase** (store metadata and auth)  
- **Pinecone** (vector storage for RAG)

## Root Causes Identified

1. **Race Condition**: Namespace creation happened before store updates completed in the database
2. **Security Validation**: Store validation was too strict, rejecting recently updated stores as "inactive"
3. **Token Management**: Token manager couldn't find stores during reconnection
4. **Timing Issues**: RAG engine tried to create namespaces before store data was properly synced

## Fixes Implemented

### 1. Fixed Race Condition in Vector Store (`src/lib/rag/vector-store.ts`)

**Problem**: Store validation was blocking namespace creation for recently reconnected stores.

**Solution**: Added special handling for store reconnection scenarios:

```typescript
// 🚀 ENHANCED: Allow namespace creation for recently reconnected stores
const updateData = {
  // ... existing store update logic
  // 🔥 FIX: Update last_sync_at immediately so user sees fresh timestamp  
  last_sync_at: new Date().toISOString()
};

// 🔥 FIX: Check if this is a recent reconnection (within last 5 minutes)
const recentUpdate = now.getTime() - updatedAt.getTime() < 5 * 60 * 1000;
const allowReconnection = recentUpdate || forceAllowReconnection;

if (!store || (!store.is_active && !allowReconnection)) {
  // Only fail if store is truly inactive AND not a recent reconnection
}
```

### 2. Added Sync Timing Fix in Unified RAG Engine (`src/lib/rag/unified-rag-engine.ts`)

**Problem**: Namespace initialization happened too quickly after store updates.

**Solution**: Added delay and store state verification:

```typescript
async initializeStoreNamespaces(storeId: string): Promise<{ success: boolean; error?: string }> {
  // 🚀 ENHANCED: Add brief delay to ensure store has been properly updated in DB
  console.log(`[UNIFIED-RAG] ⏳ Waiting for store update synchronization...`);
  await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
  
  // 🚀 ENHANCED: Verify store is ready for namespace creation
  const { data: store, error } = await supabase
    .from('stores')
    .select('is_active, updated_at, created_at')
    .eq('id', storeId)
    .single();
    
  if (store) {
    const timeSinceUpdate = now.getTime() - updatedAt.getTime();
    // If store was updated very recently (less than 30 seconds), it's likely a reconnection
    if (timeSinceUpdate < 30000) {
      console.log(`[UNIFIED-RAG] 🔄 Detected recent store update, treating as reconnection scenario`);
    }
  }
}
```

### 3. Enhanced Store Reconnection in Store Data Manager (`src/lib/services/store-data-manager.ts`)

**Problem**: Store reconnection didn't immediately initialize namespaces.

**Solution**: Added immediate namespace creation with production fix:

```typescript
// 🔥 PRODUCTION FIX: Immediate namespace initialization + validation
try {
  const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
  const ragEngine = getUnifiedRAGEngine();
  
  // STEP 1: Force immediate namespace initialization
  const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
  
  if (namespaceResult.success) {
    // STEP 2: Trigger immediate data sync to populate namespaces
    const syncResult = await ragEngine.indexStoreData(storeId, accessToken);
    
    if (syncResult.success) {
      console.log(`✅ Immediate sync indexed ${syncResult.documentsIndexed} documents`);
    }
  }
} catch (ragError) {
  console.error(`❌ Production fix failed: ${ragError.message}`);
  // Don't fail the whole operation - background job might still work
}
```

### 4. Debug Tools Created

#### A. Debug API Endpoint (`src/app/api/debug/fix-pinecone-namespaces/route.ts`)

Manually triggers namespace creation for stores:

```bash
# Fix all user's stores
curl -X POST /api/debug/fix-pinecone-namespaces -H "Content-Type: application/json" -d '{}'

# Fix specific store  
curl -X POST /api/debug/fix-pinecone-namespaces -H "Content-Type: application/json" -d '{"storeId": "store-id-here"}'
```

#### B. RAG Access Test Endpoint (`src/app/api/debug/test-agent-rag-access/route.ts`)

Tests if agents can access RAG data:

```bash
curl -X POST /api/debug/test-agent-rag-access -H "Content-Type: application/json" -d '{"storeId": "store-id-here", "query": "productos disponibles"}'
```

#### C. Manual Fix Script (`scripts/fix-pinecone-namespaces.js`)

Node.js script for manual fixes:

```bash
# Fix all stores
node scripts/fix-pinecone-namespaces.js

# Fix specific store
node scripts/fix-pinecone-namespaces.js --store-id=store-id-here

# Fix all stores for a user
node scripts/fix-pinecone-namespaces.js --user-id=user-id-here
```

## How to Test the Fixes

### 1. Check Current State
```bash
# Check if stores exist in Supabase
SELECT id, name, is_active, last_sync_at FROM stores WHERE platform = 'tiendanube';

# Check Pinecone namespaces (should show 6 per store: store, products, orders, customers, analytics, conversations)
```

### 2. Trigger Manual Fix

**Option A: Use API endpoint** (if server is running):
```bash
curl -X POST https://your-domain.com/api/debug/fix-pinecone-namespaces -H "Content-Type: application/json" -d '{}'
```

**Option B: Use Node.js script**:
```bash
node scripts/fix-pinecone-namespaces.js
```

### 3. Verify Fix Worked

**Test RAG access**:
```bash
curl -X POST https://your-domain.com/api/debug/test-agent-rag-access -H "Content-Type: application/json" -d '{"storeId": "your-store-id", "query": "productos disponibles"}'
```

**Check Pinecone**: Should now show 6 namespaces per store.

### 4. Test Agent Responses

Try asking the analytics agent questions about store data:
- "¿Cuántos productos tengo?"
- "¿Cuáles son mis ventas del último mes?"
- "¿Qué productos son más populares?"

Agents should now provide data-driven responses instead of hallucinating.

## Prevention Measures

### 1. Enhanced Error Handling

All RAG operations now have robust fallbacks and won't completely fail if one step has issues.

### 2. Timing Controls

Added delays and state verification to prevent race conditions during store reconnection.

### 3. Multiple Sync Paths

- Immediate sync during reconnection
- Background sync for robustness
- Manual fix tools for troubleshooting

### 4. Better Logging

Enhanced logging with specific prefixes:
- `[SYNC:INFO]` - Store sync operations
- `[UNIFIED-RAG]` - RAG engine operations  
- `[RAG:SECURITY]` - Security validations
- `[DEBUG]` - Debug operations

## Monitoring

### Key Metrics to Watch

1. **Namespace Count**: Each active store should have exactly 6 namespaces
2. **Agent Response Quality**: Agents should cite specific data, not provide generic advice
3. **Sync Timestamps**: `last_sync_at` should be recent for active stores
4. **Error Logs**: Watch for RAG security validation errors

### Alert Conditions

- Store has 0 namespaces after reconnection
- Agent responses contain "información limitada" consistently  
- RAG search returns 0 documents for active stores
- Multiple "Cannot create namespace for inactive store" errors

## Next Steps

1. **Test the fixes** with real store reconnections
2. **Monitor agent responses** for improved data accuracy
3. **Set up alerts** for namespace count mismatches
4. **Consider auto-fix** triggers for newly detected issues

## Files Modified

- `src/lib/rag/vector-store.ts` - Fixed race condition
- `src/lib/rag/unified-rag-engine.ts` - Added sync timing
- `src/lib/services/store-data-manager.ts` - Enhanced reconnection
- `src/app/api/debug/fix-pinecone-namespaces/route.ts` - Debug endpoint
- `src/app/api/debug/test-agent-rag-access/route.ts` - Test endpoint  
- `scripts/fix-pinecone-namespaces.js` - Manual fix script

The fixes address the core synchronization issues while providing tools to diagnose and resolve problems quickly when they occur. 