# TiendaNube Token Management - Best Practices Implementation

## 🚨 Issue Fixed: "No valid token available for store"

### Problem Summary
The original implementation violated **TiendaNube's OAuth best practices** by attempting to use refresh token logic when TiendaNube doesn't support refresh tokens. This caused the error "No valid token available for store" in production.

---

## ❌ What Was Wrong (Violations of TiendaNube Best Practices)

### 1. **Incorrect Refresh Token Logic**
```typescript
// ❌ WRONG: Trying to refresh tokens when TiendaNube doesn't support them
private static async refreshToken(storeId: string, refreshToken: string) {
  // This was trying to use refresh_token which is always null for TiendaNube
  const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
    body: new URLSearchParams({
      grant_type: 'refresh_token',  // ❌ TiendaNube doesn't support this
      refresh_token: refreshToken,  // ❌ Always null for TiendaNube
    }),
  });
}
```

### 2. **Wrong Token Expiration Logic**
```typescript
// ❌ WRONG: Checking expiration times when TiendaNube tokens are long-lived
const expiresAt = new Date(store.token_expires_at || 0);
if (expiresAt.getTime() > now.getTime() + bufferTime) {
  return store.access_token;
}
// ❌ WRONG: Trying to refresh when token appears "expired"
const refreshResult = await this.refreshToken(store.id, store.refresh_token);
```

### 3. **Misunderstanding TiendaNube's OAuth Model**
- TiendaNube uses **Authorization Code Flow WITHOUT refresh tokens**
- Tokens are **long-lived (up to 1 year)**
- Tokens only invalidate when user explicitly revokes permissions or uninstalls app

---

## ✅ Fixed Implementation (Following TiendaNube Best Practices)

### 1. **Validation-Only Approach**
```typescript
// ✅ CORRECT: Validate tokens via API calls, not expiration checks
static async getValidToken(storeId: string): Promise<string | null> {
  // Get token from database
  const store = await supabase.from('stores').select('access_token, platform_store_id')...
  
  // ✅ CRITICAL: Validate by making API call, not checking expiration
  try {
    const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
    await api.getStore(); // Lightweight validation call
    
    console.log(`[TOKEN] ✅ Token validated successfully for store: ${storeId}`);
    return store.access_token;
    
  } catch (validationError) {
    // ✅ CORRECT: Handle auth errors properly
    const isAuthError = validationError.message.includes('401') || 
                       validationError.message.includes('403');
    
    if (isAuthError) {
      // ✅ CORRECT: Mark for OAuth reconnection instead of trying to refresh
      await this.markStoreForReconnection(store.id, 'Token validation failed');
      return null;
    }
    
    // For non-auth errors, return token anyway (network issues, etc.)
    return store.access_token;
  }
}
```

### 2. **No Refresh Token Logic**
```typescript
// ✅ CORRECT: No refresh methods - TiendaNube doesn't support them
// Removed all refresh token logic:
// - refreshToken() method removed
// - refreshExpiringTokens() method removed
// - All references to refresh_token removed from validation logic
```

### 3. **Proper Error Handling**
```typescript
// ✅ CORRECT: OAuth reconnection flow for invalid tokens
async markStoreForReconnection(storeId: string, reason: string): Promise<boolean> {
  const updateData = {
    is_active: false, // Deactivate until reconnected
    store_data: {
      reconnection_required: true,
      reason,
      marked_at: new Date().toISOString()
    }
  };
  
  return await StoreService.updateStore(storeId, updateData);
}
```

---

## 📋 TiendaNube OAuth Best Practices (Official)

Based on [TiendaNube API Documentation](https://dev.nuvemshop.com.br/es/docs/developer-tools/nuvemshop-api):

### ✅ DO's:
1. **Use Authorization Code Flow** - Standard OAuth 2.0 flow
2. **Long-lived tokens** - Tokens can last up to 1 year
3. **Validation via API calls** - Test tokens by making lightweight API requests
4. **Include User-Agent header** - Always include proper User-Agent in API calls
5. **Handle 401/403 gracefully** - Redirect to OAuth re-authorization when tokens are invalid
6. **Store tokens securely** - Encrypt access tokens in database

### ❌ DON'Ts:
1. **Don't use refresh tokens** - TiendaNube doesn't support them
2. **Don't check token expiration times** - Use API validation instead
3. **Don't implement refresh logic** - Will always fail
4. **Don't assume tokens expire on schedule** - They invalidate based on user actions

---

## 🧪 Testing the Fix

Use the debug endpoint to verify the fix:

```bash
# Test the fixed token management
curl https://your-app.vercel.app/api/debug/tiendanube-token-fix
```

Expected response:
```json
{
  "success": true,
  "summary": {
    "fixStatus": "✅ FIXED - Following TiendaNube Best Practices"
  },
  "bestPracticesCompliance": {
    "noRefreshTokensUsed": true,
    "validationBasedApproach": true,
    "properErrorHandling": true,
    "longLivedTokenSupport": true
  }
}
```

---

## 🚀 Implementation Changes Made

### Files Modified:
1. **`src/lib/integrations/tiendanube-token-manager.ts`**
   - Removed all refresh token logic
   - Implemented validation-only approach
   - Added proper error handling for auth failures
   - Simplified token management for long-lived tokens

2. **`src/app/api/debug/tiendanube-token-fix/route.ts`** (new)
   - Debug endpoint to test and verify the fix
   - Compliance checking for TiendaNube best practices

### Key Changes:
- ✅ **Removed** `refreshToken()` method completely
- ✅ **Removed** expiration-based token validation
- ✅ **Added** API-call-based token validation
- ✅ **Added** proper OAuth reconnection flow
- ✅ **Simplified** token management for long-lived tokens

---

## 📚 References

1. **TiendaNube API Documentation**: https://dev.nuvemshop.com.br/es/docs/developer-tools/nuvemshop-api
2. **OAuth 2.0 Best Practices**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics
3. **Token Management Guidelines**: Multiple sources confirming TiendaNube doesn't use refresh tokens

---

## 🔮 Future Considerations

1. **Monitor token health** - Use the health check methods regularly
2. **User notification** - Inform users when tokens need reconnection
3. **Graceful degradation** - Handle invalid tokens without breaking user experience
4. **Rate limiting** - Respect TiendaNube's API rate limits during validation

---

## 🆘 Troubleshooting

### If you see "No valid token available for store" again:
1. Check if the store exists in database
2. Verify the token exists and is not null
3. Test token with a direct API call to TiendaNube
4. Check if user has revoked app permissions
5. Use the debug endpoint to diagnose issues

### Common solutions:
- **Invalid token**: Guide user through OAuth reconnection
- **Network issues**: Retry with exponential backoff
- **Rate limiting**: Implement proper delays between API calls 