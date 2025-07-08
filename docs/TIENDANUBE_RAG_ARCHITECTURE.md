# 🏪🔍 ARQUITECTURA COMPLETA: TIENDA NUBE ↔ PINECONE RAG VECTOR STORE

## 📋 RESUMEN EJECUTIVO

Este documento define la **arquitectura unificada y completa** para el manejo de datos entre Tienda Nube y Pinecone RAG vector store en Fini AI. Establece claramente qué sucede en cada etapa del ciclo de vida de las tiendas y cómo se mantiene la sincronización de datos.

### 🎯 OBJETIVOS

1. **Definir el flujo completo** de datos desde Tienda Nube hasta Pinecone
2. **Establecer ciclos de vida claros** para cada operación de tienda
3. **Unificar sistemas fragmentados** en una arquitectura coherente
4. **Garantizar consistencia** entre sistemas de datos
5. **Proporcionar fallbacks robustos** para manejo de errores

---

## 🏗️ ARQUITECTURA GENERAL

### **COMPONENTES PRINCIPALES**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TIENDA NUBE   │ ─→ │   FINI AI DB    │ ─→ │   PINECONE RAG  │
│   (API Source)  │    │  (PostgreSQL)   │    │ (Vector Store)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────→│  TOKEN MANAGER  │←─────────────┘
                        │   (OAuth/Auth)  │
                        └─────────────────┘
```

### **FLUJO DE DATOS UNIFICADO**

```
TIENDA NUBE API → TOKEN VALIDATION → DATA EXTRACTION → PROCESSING → EMBEDDINGS → PINECONE STORAGE
      ↓                   ↓              ↓              ↓            ↓            ↓
   Products           Valid Token    Clean Data    Document Chunks  Vectors   Namespaces
   Orders             + Store ID     + Metadata    + Metadata       + Meta    + Security
   Customers                                                                  + Search
   Analytics
   Store Info
```

---

## 🔄 CICLO DE VIDA COMPLETO DE TIENDAS

### **1. 🆕 CREAR TIENDA NUEVA**

#### **TRIGGER**: Usuario conecta tienda por primera vez via OAuth

#### **PROCESO PASO A PASO**:

```typescript
// PASO 1: OAuth Callback Exitoso
1. Recibir authorization_code de Tienda Nube
2. Intercambiar code por access_token (TiendaNube API)
3. Validar token y obtener store info básico

// PASO 2: Crear Registro en DB (RÁPIDO - <5 segundos)
4. StoreService.createStore() → Insertar en tabla `stores`
5. TiendaNubeTokenManager.storeToken() → Insertar en tabla `tiendanube_tokens`
6. Retornar SUCCESS inmediatamente al usuario

// PASO 3: Background Sync (ASÍNCRONO - 2-5 minutos)
7. HTTP fire-and-forget a /api/stores/background-sync
8. FiniRAGEngine.initializeStoreNamespaces(storeId)
9. FiniRAGEngine.indexStoreData(storeId, accessToken)
10. StoreService.updateStore(storeId, { last_sync_at: NOW() })
```

#### **NAMESPACES CREADOS EN PINECONE**:
```typescript
const namespaces = [
  `store-${storeId}`,              // Información general de la tienda
  `store-${storeId}-products`,     // Catálogo de productos
  `store-${storeId}-orders`,       // Historial de pedidos
  `store-${storeId}-customers`,    // Base de clientes
  `store-${storeId}-analytics`,    // Métricas y estadísticas
  `store-${storeId}-conversations` // Historial de conversaciones
];
```

#### **DATOS INDEXADOS**:
- ✅ **Store Info**: Nombre, descripción, URL, país, moneda
- ✅ **Products**: Nombre, descripción, precio, categorías, tags, variants, SEO
- ✅ **Orders**: IDs, status, totales, productos, clientes, fechas
- ✅ **Customers**: Nombres, emails, historial de compras
- ✅ **Analytics**: Ventas, conversiones, productos top, métricas clave

#### **TIEMPO ESPERADO**:
- **DB Creation**: <5 segundos
- **Namespace Setup**: <30 segundos
- **Full Data Sync**: 2-5 minutos
- **Usuario puede usar chat**: Inmediatamente (con datos básicos)

---

### **2. 🔄 RECONECTAR TIENDA EXISTENTE**

#### **TRIGGER**: Usuario reconecta tienda con token expirado/inválido

#### **PROCESO PASO A PASO**:

```typescript
// PASO 1: OAuth Callback de Reconexión
1. Recibir nuevo authorization_code
2. Intercambiar por nuevo access_token
3. Identificar tienda existente por platform_store_id

// PASO 2: Actualizar Registros (RÁPIDO - <3 segundos)
4. StoreService.createOrUpdateStore() → UPSERT en tabla `stores`
5. TiendaNubeTokenManager.refreshToken() → UPDATE en `tiendanube_tokens`
6. Marcar tienda como is_active: true

// PASO 3: Background Cleanup + Re-sync (ASÍNCRONO - 3-7 minutos)
7. HTTP fire-and-forget a /api/stores/background-cleanup
8. FiniRAGEngine.deleteStoreNamespaces(storeId) → Limpiar datos viejos
9. FiniRAGEngine.initializeStoreNamespaces(storeId) → Recrear namespaces
10. FiniRAGEngine.indexStoreData(storeId, newAccessToken) → Re-indexar todo
11. StoreService.updateStore(storeId, { last_sync_at: NOW() })
```

#### **ESTRATEGIA DE CLEANUP**:
```typescript
// LIMPIEZA SEGURA DE VECTORS
1. Identificar todos los namespaces de la tienda
2. PineconeVectorStore.deleteAll(namespace) para cada uno
3. Esperar confirmación de limpieza
4. Proceder con re-indexación completa
```

#### **TIEMPO ESPERADO**:
- **DB Update 