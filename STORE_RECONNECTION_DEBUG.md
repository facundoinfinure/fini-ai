# 🔧 Store Reconnection Debug Guide

Este documento te ayuda a diagnosticar y resolver problemas de reconexión de tiendas que pueden causar fechas de sincronización incorrectas y namespaces de Pinecone incompletos.

## 🔍 Endpoint de Diagnóstico

### GET `/api/debug/store-reconnection-status`

Verifica el estado completo de todas tus tiendas conectadas:

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalStores": 1,
      "healthyStores": 0,
      "storesNeedingSync": 0,
      "storesWithIncompleteRAG": 1,
      "storesWithoutToken": 0
    },
    "stores": [
      {
        "storeId": "ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a",
        "storeName": "LOBO",
        "overallStatus": "incomplete-rag",
        "issues": ["Only 2/6 namespaces exist"],
        "timestamps": {
          "updatedAt": "2024-12-20T08:22:00.000Z",
          "lastSyncAt": "2024-12-19T15:30:00.000Z",
          "minutesSinceUpdate": 5,
          "minutesSinceSync": 1020
        },
        "rag": {
          "status": "partial",
          "namespaceCount": 2,
          "expectedNamespaces": 6
        }
      }
    ],
    "recommendations": [
      "1 store(s) have incomplete RAG namespaces. Use POST with action 'reinitialize-namespaces'."
    ]
  }
}
```

### Estados de Tienda

- **`healthy`**: Todo funciona correctamente
- **`needs-sync`**: Nunca se sincronizó
- **`stale`**: Última sincronización hace más de 1 hora
- **`incomplete-rag`**: Faltan namespaces de Pinecone (menos de 6)
- **`no-token`**: Falta token de acceso

### Estados de RAG

- **`complete`**: 6/6 namespaces creados ✅
- **`partial`**: Algunos namespaces faltantes ⚠️
- **`missing`**: No hay namespaces ❌
- **`error`**: Error al verificar ⚠️

## 🔧 Acciones de Reparación

### POST `/api/debug/store-reconnection-status`

Puedes ejecutar estas acciones para reparar problemas:

#### 1. Force Sync (Sincronización Forzada)
```bash
curl -X POST https://tu-app.vercel.app/api/debug/store-reconnection-status \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "tu-store-id",
    "action": "force-sync"
  }'
```

**Usar cuando:**
- `overallStatus`: `needs-sync` o `stale`
- La fecha de última sincronización está desactualizada

#### 2. Reinitialize Namespaces (Reinicializar Namespaces)
```bash
curl -X POST https://tu-app.vercel.app/api/debug/store-reconnection-status \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "tu-store-id",
    "action": "reinitialize-namespaces"
  }'
```

**Usar cuando:**
- `rag.status`: `partial` o `missing`
- `namespaceCount` < 6

#### 3. Full Reconnection (Reconexión Completa)
```bash
curl -X POST https://tu-app.vercel.app/api/debug/store-reconnection-status \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "tu-store-id",
    "action": "full-reconnection"
  }'
```

**Usar cuando:**
- Múltiples problemas combinados
- Quieres empezar desde cero

## 🚀 Flujo de Reparación Recomendado

### Para tu problema actual (fecha ayer + 2 namespaces):

1. **Diagnóstica primero:**
   ```bash
   curl https://tu-app.vercel.app/api/debug/store-reconnection-status
   ```

2. **Si ves `incomplete-rag`, ejecuta reinitialización:**
   ```bash
   curl -X POST https://tu-app.vercel.app/api/debug/store-reconnection-status \
     -H "Content-Type: application/json" \
     -d '{
       "storeId": "tu-store-id",
       "action": "reinitialize-namespaces"
     }'
   ```

3. **Espera 2-3 minutos y verifica de nuevo:**
   ```bash
   curl https://tu-app.vercel.app/api/debug/store-reconnection-status
   ```

4. **Si el problema persiste, usa reconexión completa:**
   ```bash
   curl -X POST https://tu-app.vercel.app/api/debug/store-reconnection-status \
     -H "Content-Type: application/json" \
     -d '{
       "storeId": "tu-store-id",
       "action": "full-reconnection"
     }'
   ```

## 📊 Interpretar Resultados

### ✅ Estado Saludable
```json
{
  "overallStatus": "healthy",
  "rag": {
    "status": "complete",
    "namespaceCount": 6
  },
  "timestamps": {
    "minutesSinceSync": 15
  }
}
```

### ⚠️ Necesita Atención
```json
{
  "overallStatus": "incomplete-rag",
  "issues": ["Only 2/6 namespaces exist"],
  "rag": {
    "status": "partial",
    "namespaceCount": 2
  }
}
```

## 🔧 Automatización

Puedes automatizar el monitoreo agregando esto a tu rutina de mantenimiento:

```bash
#!/bin/bash
# check-stores.sh

echo "🔍 Verificando estado de tiendas..."
response=$(curl -s https://tu-app.vercel.app/api/debug/store-reconnection-status)

incomplete=$(echo $response | jq '.data.summary.storesWithIncompleteRAG')

if [ "$incomplete" -gt 0 ]; then
  echo "⚠️ Se encontraron $incomplete tiendas con RAG incompleto"
  echo "💡 Ejecuta: reinitialize-namespaces"
else
  echo "✅ Todas las tiendas están saludables"
fi
```

## 📝 Notas Importantes

1. **Las acciones son seguras**: No pierdes datos, solo recreas índices
2. **Tiempo de procesamiento**: 2-5 minutos para acciones completas
3. **Verificación**: Siempre verifica el estado después de ejecutar acciones
4. **Autenticación**: Debes estar logueado para acceder al endpoint

## 🐛 Troubleshooting

### Error 401: Unauthorized
- Asegúrate de estar autenticado en la aplicación
- El endpoint requiere cookies de sesión válidas

### Error 404: Store not found  
- Verifica que el `storeId` sea correcto
- La tienda debe pertenecerte

### Action Timeout
- Espera 5 minutos e intenta nuevamente
- Usa `force-sync` en lugar de `full-reconnection`

---

Con estos comandos puedes diagnosticar y resolver los problemas de reconexión que estás experimentando. ¡El endpoint nuevo debería resolver completamente el problema de fechas desactualizadas y namespaces incompletos! 🚀 