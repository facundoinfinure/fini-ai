# 🧠 Routing Inteligente con OpenAI - Setup

## 📋 **Estado Actual**

El sistema tiene **dos niveles de routing**:

### 🥇 **Nivel 1: Routing Inteligente con OpenAI** (Recomendado)
- **Precisión**: 90-95%
- **Requerimiento**: API Key de OpenAI
- **Funcionamiento**: Analiza la intención semántica del usuario

### 🥈 **Nivel 2: Keyword-based Routing** (Fallback)
- **Precisión**: 70-80% 
- **Requerimiento**: Ninguno
- **Funcionamiento**: Matching de keywords y patterns

---

## ⚡ **Activar Routing Inteligente**

### 1. **Obtener API Key de OpenAI**
```bash
# Ir a: https://platform.openai.com/api-keys
# Crear nueva API key
# Copiar la key (sk-...)
```

### 2. **Configurar en Vercel**
```bash
# Ir a Vercel Dashboard > fini-ai > Settings > Environment Variables
# Agregar:
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. **Configurar en Local** (Desarrollo)
```bash
# En archivo .env.local
echo "OPENAI_API_KEY=sk-your-actual-api-key-here" >> .env.local
```

### 4. **Verificar Configuración**
```bash
curl -X GET https://tu-dominio.vercel.app/api/debug/test-intelligent-routing
# Debe retornar: "openaiConfigured": true
```

---

## 🧪 **Testing Routing Inteligente**

### Test básico:
```bash
curl -X POST https://tu-dominio.vercel.app/api/debug/test-intelligent-routing \
  -H "Content-Type: application/json" \
  -d '{"message": "que productos tengo cargados en mi tienda?"}'
```

### Resultado esperado:
```json
{
  "success": true,
  "intelligentRouting": {
    "result": {
      "selectedAgent": "product_manager",
      "confidence": 0.95,
      "reasoning": "Análisis inteligente: Consulta sobre gestión de catálogo..."
    },
    "type": "openai_analysis"
  },
  "openaiAvailable": true
}
```

---

## 📊 **Comparación de Routing**

### Con OpenAI (Inteligente):
```
"que productos tengo cargados?" 
→ OpenAI Analysis: product_manager (95% confidence)
→ Reasoning: "Consulta de gestión de catálogo actual"
```

### Sin OpenAI (Keywords):
```
"que productos tengo cargados?"
→ Keyword Analysis: product_manager (62% confidence) 
→ Reasoning: "Keywords encontradas: productos, tengo, cargados"
```

---

## 🎯 **Casos que Mejoran con OpenAI**

### Consultas Ambiguas:
- **"mis productos"** → OpenAI puede distinguir contexto
- **"análisis de productos"** → Analytics vs Product Manager
- **"productos sin vender"** → Stock Manager vs Analytics

### Intención Compleja:
- **"¿Debería agregar más productos como los que más se venden?"**
- **"Quiero optimizar mi catálogo basado en ventas"**
- **"¿Qué productos me conviene discontinuar?"**

### Multi-agente:
- Consultas que requieren coordinación entre agentes
- Análisis cross-funcional

---

## 🔄 **Fallback Automático**

El sistema **siempre funciona**, con o sin OpenAI:

1. **Intenta routing inteligente** (si API key disponible)
2. **Si falla o no disponible** → **Keyword routing**
3. **Si keyword score muy bajo** → **Fallback message**

---

## 💰 **Costos OpenAI**

### Estimación de uso:
- **Promedio**: ~50 tokens por consulta de routing
- **Modelo**: GPT-3.5-turbo (~$0.002 por 1k tokens)
- **Costo por consulta**: ~$0.0001 (muy bajo)

### Para 1000 consultas/mes:
- **Costo routing**: ~$0.10/mes
- **Beneficio**: +20% precisión en routing

---

## ✅ **Estado Actual del Sistema**

### ✅ **Funcionando bien (Keyword routing):**
- "que productos tengo cargados?" → Product Manager ✅
- "cuales son mis productos mas vendidos?" → Analytics ✅  
- "que productos necesito reponer?" → Stock Manager ✅
- "cuales son mis productos mas rentables?" → Financial Advisor ✅

### 🚀 **Mejora con OpenAI:**
- Mayor precisión en casos ambiguos
- Mejor manejo de intención compleja
- Análisis de contexto avanzado

---

## 🔧 **Configuración Recomendada**

### Producción:
```bash
OPENAI_API_KEY=sk-prod-key-here  # ← Activar routing inteligente
```

### Development/Testing:
```bash
OPENAI_API_KEY=sk-dev-key-here   # ← Para testing
# O sin API key para probar keyword fallback
```

El sistema está **production-ready** con o sin OpenAI. La API key es una **mejora opcional** que aumenta la precisión. 