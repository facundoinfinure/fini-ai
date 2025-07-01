# Responsabilidades de Agentes - Fini AI

## 📊 **Analytics Agent**
**Especialidad**: Performance, métricas y resultados de ventas

### ✅ **Maneja:**
- Métricas de ventas (`¿Cuánto vendí ayer?`)
- **Performance de productos** (`¿Cuáles son mis productos MÁS VENDIDOS?`)
- Estadísticas y reportes (`Dame un reporte de ventas`)
- Comparaciones temporales (`¿Cómo van las ventas vs el mes pasado?`)
- KPIs y conversiones (`¿Cuál es mi tasa de conversión?`)
- Análisis de tendencias (`¿Qué tendencias veo en mis ventas?`)
- Forecasting (`¿Cuánto voy a vender este mes?`)
- **Productos que generan más revenue** (`¿Qué productos me dan más ganancia?`)

### ❌ **NO maneja:**
- **Información de catálogo** (precios, características, qué productos tengo)
- Gestión de productos
- **Precios de productos** (eso es Product Manager)
- Gestión de inventario

---

## 🛍️ **Product Manager Agent**  
**Especialidad**: Información del catálogo y características de productos

### ✅ **Maneja:**
- **Información del catálogo** (`¿Qué productos tengo cargados?`)
- **Precios y características** (`¿Cuál es el producto MÁS CARO/BARATO?`)
- **Stock disponible** (`¿Cuánto stock tiene el producto X?`)
- **Detalles de productos** (`¿Qué características tiene este producto?`)
- Gestión de portfolio (`¿Debería agregar este producto?`)
- Estrategia de productos (`¿Qué productos me faltan?`)
- Análisis de gaps (`¿Qué categorías no tengo cubierta?`)
- Optimización de catálogo (`¿Cómo mejoro mi catálogo?`)
- Pricing strategy (`¿Cómo optimizo mis precios?`)
- Lifecycle de productos (`¿Cuándo descontinuar un producto?`)

### ❌ **NO maneja:**
- **Performance de ventas** (cuáles son los más vendidos)
- Métricas de revenue y ganancias
- Reportes estadísticos de ventas
- Performance histórico de productos

---

## 📦 **Stock Manager Agent**
**Especialidad**: Gestión de inventario y stock

### ✅ **Maneja:**
- Niveles de stock (`¿Qué productos están sin stock?`)
- Reposición (`¿Qué necesito reponer urgente?`)
- Gestión de inventario (`¿Tengo mucho stock parado?`)
- Alertas de stock bajo
- Optimización de inventario
- Análisis de rotación

---

## 💰 **Financial Advisor Agent**
**Especialidad**: Análisis financiero y rentabilidad

### ✅ **Maneja:**
- Rentabilidad (`¿Cuáles son mis productos más rentables?`)
- Márgenes (`¿Qué margen tengo en cada producto?`)
- Costos (`¿Cuánto me cuesta cada venta?`)
- Flujo de caja (`¿Cómo está mi cash flow?`)
- ROI de marketing (`¿Me conviene esta campaña?`)
- Análisis de precios (`¿Están bien mis precios?`)

---

## 🎯 **Marketing Agent**
**Especialidad**: Estrategias de marketing y promoción

### ✅ **Maneja:**
- Ideas de marketing (`¿Cómo aumento las ventas?`)
- Campañas (`¿Qué promoción hago?`)
- Análisis de competencia
- Estrategias de crecimiento
- Content marketing
- Segmentación de clientes

---

## 🤝 **Customer Service Agent**
**Especialidad**: Atención al cliente y soporte

### ✅ **Maneja:**
- Consultas de clientes
- Problemas con pedidos
- Políticas de devolución
- Soporte técnico
- Escalamiento de issues
- Gestión de reclamos

---

## 🧠 **Business Consultant Agent**
**Especialidad**: Consultoría estratégica

### ✅ **Maneja:**
- Estrategia de negocio
- Planes de crecimiento
- Análisis FODA
- Expansión de mercado
- Consultoría integral
- Decisiones estratégicas

---

## 🏃 **Operations Manager Agent**
**Especialidad**: Operaciones y logística

### ✅ **Maneja:**
- Optimización de procesos
- Logística y envíos
- Automatización
- Gestión de proveedores
- Eficiencia operativa

---

## 🏆 **Sales Coach Agent**
**Especialidad**: Coaching de ventas

### ✅ **Maneja:**
- Técnicas de venta
- Conversión
- Funnel de ventas
- Retención de clientes
- Coaching comercial

---

## 🎭 **Orchestrator Agent**
**Especialidad**: Coordinación y routing inteligente

### ✅ **Función:**
- Analizar intención del usuario con OpenAI
- Enrutar al agente correcto
- Manejar consultas ambiguas
- Coordinar respuestas multi-agente
- Proporcionar fallbacks inteligentes

---

## 🎯 **Ejemplos de Routing Correcto:**

### Analytics Agent (PERFORMANCE):
- "¿Cuánto vendí ayer?" → Analytics
- "¿Cuáles son mis productos MÁS VENDIDOS?" → Analytics  
- "Dame un reporte de ventas" → Analytics
- "¿Qué productos me generan más revenue?" → Analytics

### Product Manager Agent (INFORMACIÓN):
- "¿Qué productos tengo cargados?" → Product Manager
- "¿Cuál es el producto MÁS CARO?" → Product Manager
- "¿Qué precio tiene el producto X?" → Product Manager
- "¿Cuánto stock tengo del producto Y?" → Product Manager
- "¿Debería agregar más productos?" → Product Manager
- "¿Cómo optimizo mi catálogo?" → Product Manager

### Stock Manager Agent:
- "¿Qué productos están sin stock?" → Stock Manager
- "¿Qué necesito reponer?" → Stock Manager

### Financial Advisor Agent:
- "¿Cuáles son mis productos más rentables?" → Financial Advisor
- "¿Cómo están mis márgenes?" → Financial Advisor 