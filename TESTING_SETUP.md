# 🚀 Guía de Testing WhatsApp - Fini AI

## ¿Qué puedes hacer?

Puedes testear toda la funcionalidad de Fini AI **SIN NECESIDAD DE REGISTRO** usando tu tienda de prueba de Tienda Nube. 

## 🔗 URLs de Testing

1. **Página Web de Testing**: `http://localhost:3000/test/whatsapp-demo`
2. **API de Testing**: `http://localhost:3000/api/test/whatsapp-demo`

## ⚙️ Configuración Mínima Requerida

### 1. Variables de Entorno (.env.local)

Crea un archivo `.env.local` en la raíz del proyecto con:

```bash
# OBLIGATORIO - Twilio para WhatsApp
TWILIO_ACCOUNT_SID=tu_account_sid_de_twilio
TWILIO_AUTH_TOKEN=tu_auth_token_de_twilio  
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OBLIGATORIO - OpenAI para los agentes IA
OPENAI_API_KEY=tu_api_key_de_openai

# OPCIONAL - NextAuth (para testing sin login)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=cualquier-string-secreto

# OPCIONAL - Para desarrollo
NODE_ENV=development
DEBUG_MODE=true
```

### 2. Configuración de Twilio (5 minutos)

1. **Crea cuenta en Twilio**: https://www.twilio.com/try-twilio
2. **Ve a Console**: https://console.twilio.com/
3. **Copia tus credenciales**:
   - Account SID
   - Auth Token  
4. **Activa WhatsApp Sandbox**: 
   - Ve a Messaging > WhatsApp > Sandbox
   - Sigue las instrucciones para conectar tu número

### 3. Configuración de OpenAI

1. **Crea cuenta en OpenAI**: https://platform.openai.com/
2. **Genera API Key**: https://platform.openai.com/api-keys
3. **Copia tu API Key**

## 🎯 Modos de Testing

### Modo 1: Simulación (Sin WhatsApp Real)
- **URL**: `http://localhost:3000/test/whatsapp-demo`
- **Función**: Prueba los agentes sin enviar mensajes reales
- **Requiere**: Solo OpenAI API Key

### Modo 2: WhatsApp Real  
- **Función**: Envía y recibe mensajes reales por WhatsApp
- **Requiere**: Twilio + OpenAI configurados

### Modo 3: Testing de Agentes
- **Función**: Prueba cada agente individualmente
- **Requiere**: Solo OpenAI API Key

## 📱 Cómo Testear con tu Tienda Nube

### Opción A: Datos Mock (Rápido)
1. Ve a `http://localhost:3000/test/whatsapp-demo`
2. Escribe: "¿Cuáles fueron mis ventas de ayer?"
3. Haz clic en "🤖 Simular Chat"
4. ¡Listo! Verás la respuesta del agente

### Opción B: WhatsApp Real (Completo)
1. Configura Twilio (5 min)
2. En la página de testing, pon tu número de WhatsApp
3. Escribe un mensaje
4. Haz clic en "📱 Enviar WhatsApp"
5. ¡Recibirás la respuesta en tu WhatsApp!

## 💬 Mensajes de Ejemplo para Probar

### Analytics Agent
- "¿Cuáles fueron mis ventas de ayer?"
- "¿Cuántos productos vendí esta semana?"
- "¿Cuál es mi producto más vendido?"

### Customer Service Agent
- "Un cliente pregunta por el estado de su pedido"
- "¿Cómo proceso una devolución?"
- "Horarios de atención"

### Marketing Agent  
- "Dame ideas para promocionar mis productos"
- "¿Cómo aumento mis ventas?"
- "Ideas para campaña de Black Friday"

## 🔧 APIs Disponibles

### POST /api/test/whatsapp-demo

```bash
# Simular conversación
curl -X POST http://localhost:3000/api/test/whatsapp-demo \
  -H "Content-Type: application/json" \
  -d '{"action": "simulate_conversation", "message": "¿Cuáles fueron mis ventas?"}'

# Enviar WhatsApp real
curl -X POST http://localhost:3000/api/test/whatsapp-demo \
  -H "Content-Type: application/json" \
  -d '{"action": "send_message", "phoneNumber": "+5491123456789", "message": "Hola!"}'

# Probar agentes
curl -X POST http://localhost:3000/api/test/whatsapp-demo \
  -H "Content-Type: application/json" \
  -d '{"action": "test_agents"}'
```

### GET /api/test/whatsapp-demo
- Información del endpoint y ejemplos

## 🚨 Solución de Problemas

### Error: "WhatsApp configuration invalid"
- **Causa**: Faltan variables de Twilio
- **Solución**: Configura TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN

### Error: "OpenAI API key not configured" 
- **Causa**: Falta OPENAI_API_KEY
- **Solución**: Agrega tu API key de OpenAI

### Error: "Failed to send WhatsApp message"
- **Causa**: Configuración incorrecta de Twilio
- **Solución**: Verifica credenciales y activa WhatsApp Sandbox

### Los agentes no responden bien
- **Causa**: Probablemente configuración de OpenAI
- **Solución**: Verifica que tu API key tenga créditos

## 🎯 Próximos Pasos

1. **Testing Básico**: Usa simulación para probar agentes
2. **WhatsApp Real**: Configura Twilio para mensajes reales  
3. **Integración Tienda Nube**: Conecta tu tienda real (opcional)
4. **Datos RAG**: Configura vectores para búsquedas semánticas (avanzado)

## 📞 Testing Rápido (2 minutos)

1. Solo agrega `OPENAI_API_KEY` en `.env.local`
2. Inicia el servidor: `npm run dev`
3. Ve a: `http://localhost:3000/test/whatsapp-demo`
4. Haz clic en "🤖 Simular Chat" con cualquier mensaje
5. ¡Listo! Ya estás probando los agentes de IA

---

¿Tienes problemas? Revisa los logs en la terminal o contáctame para ayuda específica. 