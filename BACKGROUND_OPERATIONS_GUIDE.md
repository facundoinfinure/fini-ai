# 🔄 Sistema de Operaciones en Background - Guía Completa

## 📋 Resumen

Este documento describe el sistema completo de notificaciones y operaciones en background implementado en Fini AI. El sistema permite a los usuarios estar informados sobre operaciones largas en tiempo real y controlar el acceso a funcionalidades críticas cuando es necesario.

## 🎯 Casos de Uso Implementados

### 1. Conexión Inicial de Tienda (CRÍTICO - Bloquea Chat)
- **Descripción**: Primera vez que un usuario conecta una tienda
- **Tiempo estimado**: 1 minuto 30 segundos
- **Bloquea chat**: ✅ Sí
- **Pasos**:
  1. Validando conexión
  2. Sincronizando catálogo  
  3. Creando índices RAG
  4. Configurando agentes
  5. Finalizando configuración

**Escenario**: Usuario conecta su tienda por primera vez desde el OAuth callback
```typescript
// Se ejecuta automáticamente al conectar tienda nueva
const operation = createStoreConnection(storeId, storeName);
```

### 2. Actualización de Datos (NO CRÍTICO - Chat disponible con advertencia)
- **Descripción**: Sincronización regular de productos, órdenes, clientes
- **Tiempo estimado**: 45 segundos
- **Bloquea chat**: ❌ No
- **Pasos**:
  1. Obteniendo datos actualizados
  2. Procesando cambios
  3. Actualizando base de datos
  4. Sincronizando con agentes

**Escenario**: Usuario hace click en "Actualizar" en el dashboard
```typescript
// Se ejecuta al hacer refresh manual
stores.forEach(store => {
  createDataUpdate(store.id, store.name, 'manual_refresh');
});
```

### 3. Sincronización RAG (ALTA PRIORIDAD - Chat disponible con advertencia)
- **Descripción**: Actualización del sistema de búsqueda inteligente
- **Tiempo estimado**: 2 minutos
- **Bloquea chat**: ❌ No
- **Pasos**:
  1. Procesando productos
  2. Indexando órdenes
  3. Actualizando clientes
  4. Optimizando búsquedas

**Escenario**: Se ejecuta automáticamente después de cambios importantes
```typescript
// Se puede disparar manualmente o automáticamente
const operation = createRAGSync(storeId, storeName, isInitial);
```

### 4. Reconexión de Tienda (ALTA PRIORIDAD - Bloquea Chat)
- **Descripción**: Restablecimiento de conexión después de problemas de autenticación
- **Tiempo estimado**: 1 minuto
- **Bloquea chat**: ✅ Sí
- **Pasos**:
  1. Validando credenciales
  2. Limpiando datos antiguos
  3. Restableciendo conexión
  4. Sincronizando datos

### 5. Configuración WhatsApp (PRIORIDAD MEDIA - No bloquea)
- **Descripción**: Configuración inicial de WhatsApp Business
- **Tiempo estimado**: 30 segundos
- **Bloquea chat**: ❌ No
- **Pasos**:
  1. Validando número
  2. Configurando webhooks
  3. Probando conexión

### 6. Mantenimiento del Sistema (CRÍTICO - Bloquea todo)
- **Descripción**: Actualizaciones importantes del sistema
- **Tiempo estimado**: 5 minutos
- **Bloquea chat**: ✅ Sí
- **Pasos**:
  1. Preparando actualizaciones
  2. Aplicando cambios
  3. Reiniciando servicios
  4. Verificando funcionalidad

## 🔧 Componentes del Sistema

### 1. Tipos y Enums (`src/types/operations.ts`)
- `OperationType`: Enum con todos los tipos de operaciones
- `OperationStatus`: Estados de operaciones (pending, in_progress, completed, failed, etc.)
- `OperationPriority`: Niveles de prioridad (low, medium, high, critical)
- `BackgroundOperation`: Interface principal de operaciones
- `OperationNotification`: Interface de notificaciones
- `SystemStatus`: Estado general del sistema

### 2. Operation Manager (`src/lib/operations/operation-manager.ts`)
- Singleton que gestiona todas las operaciones
- Event-driven architecture con EventEmitter
- Auto-retry con backoff exponencial
- Timeout y cleanup automático
- Simulación de progreso para demo

### 3. React Hook (`src/hooks/useOperations.ts`)
- `useOperations()`: Hook principal con estado completo
- `useChatAccess()`: Hook específico para validar acceso al chat
- `useSystemStatus()`: Hook para estado del sistema
- Integración automática con eventos del manager

### 4. Componente UI (`src/components/dashboard/operation-notifications.tsx`)
- Notificaciones flotantes en esquina superior derecha
- Progress bars en tiempo real
- Botones de control (pausar, reanudar, cancelar, reintentar)
- Vista expandible con detalles técnicos
- Auto-hide para notificaciones de éxito

### 5. APIs (`src/app/api/operations/` y `src/app/api/notifications/`)
- GET/POST/PUT/DELETE para operaciones
- Dismiss y cleanup de notificaciones
- Autenticación y validación de ownership
- Integración con operaciones background existentes

## 🚀 Integración con Operaciones Existentes

### Background Sync Actualizado
El endpoint `/api/stores/background-sync` ahora:
1. Crea una operación automáticamente si `userId` está presente
2. Reporta progreso en tiempo real con `updateProgress()`
3. Completa o falla la operación según el resultado
4. Incluye `operationId` en la respuesta

### Store Service Actualizado
`StoreService.createStore()` y `createOrUpdateStore()` ahora:
1. Pasan `userId` a las operaciones background
2. Permiten tracking desde el momento de creación
3. Integran seamlessly con el nuevo sistema

## 📊 Estados del Sistema

### Operational (Verde)
- Sin operaciones activas
- Todas las funcionalidades disponibles
- Sistema funcionando normalmente

### Degraded (Amarillo)
- Operaciones no críticas en curso
- Chat disponible con advertencias
- Puede mostrar datos no actualizados

### Maintenance (Azul)
- Operaciones que bloquean chat en curso
- Funcionalidades limitadas
- Tiempo estimado de restauración mostrado

### Critical (Rojo)
- Operaciones críticas del sistema
- Servicios interrumpidos
- Solo visualización disponible

## 🎮 Casos de Prueba

### Simular Conexión Inicial de Tienda
```typescript
// En el hook useOperations
const operation = createStoreConnection("store-123", "Mi Tienda Test");
// Resultado: Chat bloqueado por ~1m30s con progreso visible
```

### Simular Actualización de Datos
```typescript
// En el dashboard al hacer refresh
const operation = createDataUpdate("store-123", "Mi Tienda", "manual");
// Resultado: Chat disponible con advertencia de datos no actualizados
```

### Simular Error y Retry
```typescript
// El sistema automáticamente reintenta operaciones fallidas
// Los usuarios pueden reintent manualmente desde la notificación
```

### Simular Múltiples Operaciones
```typescript
// Múltiples operaciones pueden correr simultáneamente
// El sistema muestra el estado más restrictivo
const op1 = createDataUpdate("store-1", "Tienda 1");
const op2 = createRAGSync("store-2", "Tienda 2");
// Resultado: Sistema en estado "degraded"
```

## 🔔 Tipos de Notificaciones

### Info (Azul)
- Operación iniciada
- Progreso intermedio
- Cambios de estado

### Warning (Amarillo)
- Funcionalidades limitadas
- Datos posiblemente desactualizados
- Operaciones pausadas

### Error (Rojo)
- Operaciones fallidas
- Errores de conectividad
- Botón de reintento disponible

### Success (Verde)
- Operaciones completadas
- Servicios restaurados
- Auto-hide después de 5 segundos

## 🎯 Mejores Prácticas

### Para Desarrolladores

1. **Siempre crear operaciones para procesos largos**:
```typescript
// ❌ Mal
await longRunningProcess();

// ✅ Bien
const operation = createOperation(type, userId, options);
// Process reports progress via operation.updateProgress()
```

2. **Clasificar correctamente la prioridad**:
```typescript
// Operaciones que DEBEN bloquear el chat
OperationPriority.CRITICAL  // Conexión inicial, migraciones

// Operaciones importantes pero no bloquean
OperationPriority.HIGH      // RAG sync, token refresh

// Operaciones de mantenimiento
OperationPriority.MEDIUM    // Data updates, optimizations

// Operaciones de background
OperationPriority.LOW       // Cleanup, housekeeping
```

3. **Usar timeouts apropiados**:
```typescript
// Operaciones cortas
estimatedDuration: 30  // 30 segundos

// Operaciones medianas  
estimatedDuration: 90  // 1.5 minutos

// Operaciones largas
estimatedDuration: 300 // 5 minutos
```

### Para Usuarios

1. **Entender los iconos**:
   - 🏪 = Configuración de tienda
   - 🔄 = Actualización de datos
   - 🧠 = Sincronización RAG
   - 📱 = WhatsApp
   - ⚙️ = Mantenimiento

2. **Interpretar los colores**:
   - Verde = Todo funcionando
   - Amarillo = Limitaciones temporales
   - Azul = Mantenimiento planificado
   - Rojo = Problemas que requieren atención

3. **Usar los controles**:
   - "Detalles" = Ver progreso técnico
   - "Pausar" = Para operaciones largas si es necesario
   - "Reintentar" = Para operaciones fallidas
   - "Cancelar" = Solo para operaciones no iniciadas

## 🚀 Próximas Mejoras

### WebSockets en Tiempo Real
- Notificaciones push instantáneas
- Sincronización entre múltiples pestañas
- Colaboración en tiempo real

### Persistencia de Estado
- Operaciones sobreviven refreshes
- Historial de operaciones
- Métricas de rendimiento

### Operaciones Programadas
- Sync automático nocturno
- Limpieza programada
- Reportes automáticos

### Notificaciones Avanzadas
- Notificaciones por email/WhatsApp
- Configuración de preferencias
- Agrupación inteligente

## 📝 Conclusión

El sistema de operaciones en background de Fini AI proporciona:

✅ **Transparencia total** sobre operaciones del sistema
✅ **Control granular** sobre el acceso a funcionalidades
✅ **Experiencia de usuario optimizada** con información clara
✅ **Arquitectura extensible** para nuevos tipos de operaciones
✅ **Manejo robusto de errores** con retry automático
✅ **Estimaciones precisas** de tiempo de completado

El usuario siempre sabe exactamente qué está pasando en su sistema y cuánto tiempo deberá esperar para acceder a todas las funcionalidades. 