# 🚀 **FINI AI - NUEVA GUÍA DE USO**
## **WhatsApp-Centric: Tu Asistente de IA por WhatsApp**

---

## **🎯 NUEVO FLUJO DE USUARIO**

### **1. 📋 REGISTRO Y CONFIGURACIÓN INICIAL**
1. **Registro/Login**: Crear cuenta o iniciar sesión
2. **Conectar Tienda**: Conectar tu tienda real de Tienda Nube (no automático)
3. **Configurar WhatsApp**: Agregar números de WhatsApp autorizados
4. **Activar Fini**: Enviar mensaje inicial para activar el asistente

### **2. 💬 GESTIÓN POR WHATSAPP**
Una vez configurado, **TODO** se maneja por WhatsApp:
- Analytics de ventas
- Estrategias de marketing  
- Atención al cliente
- Consultas generales

---

## **📱 CONFIGURACIÓN PASO A PASO**

### **PASO 1: Onboarding**
```
1. Ve a: http://localhost:3000/onboarding
2. Completa los 3 pasos:
   ✅ Conectar tu tienda de Tienda Nube
   ✅ Configurar números de WhatsApp
   ✅ Activar Fini AI
```

### **PASO 2: Conectar Tienda Real**
```
Opciones disponibles:
- OAuth Flow: Conecta tu tienda real con autorización segura
- Modo Demo: Para testing rápido con datos de ejemplo
```

### **PASO 3: Configurar WhatsApp**
```
- Agrega tus números de WhatsApp (formato: +5491123456789)
- El sistema generará la URL del webhook automáticamente
- Configura la URL en tu consola de Twilio
```

### **PASO 4: Usar por WhatsApp**
```
Número Fini AI: +14065002249
Envía mensajes desde cualquiera de tus números configurados
```

---

## **🤖 COMANDOS DISPONIBLES POR WHATSAPP**

### **📊 ANALYTICS**
```
Ejemplos de comandos:
• "¿Cuáles fueron mis ventas ayer?"
• "¿Cuánto gané esta semana?"
• "¿Qué productos se vendieron más?"
• "Muéstrame las estadísticas del mes"
• "¿Cuántos clientes nuevos tuve?"
```

### **🚀 MARKETING**
```
Ejemplos de comandos:
• "Dame ideas para promocionar mis productos"
• "Estrategias para Black Friday"
• "¿Cómo aumentar mis ventas?"
• "Ideas de contenido para redes sociales"
• "Campañas para navidad"
```

### **💬 ATENCIÓN AL CLIENTE**
```
Ejemplos de comandos:
• "Un cliente no recibió su pedido"
• "Ayúdame con una devolución"
• "¿Cómo funciona la garantía?"
• "Política de cambios"
• "Problema con un pago"
```

### **❓ AYUDA**
```
Comandos de ayuda:
• "¿Qué puedes hacer?"
• "Ayuda"
• "Comandos disponibles"
• "Soporte"
```

---

## **🔧 CONFIGURACIÓN TÉCNICA**

### **Variables de Entorno Requeridas**
```bash
# WhatsApp/Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14065002249

# Tienda Nube OAuth (opcional)
TIENDANUBE_CLIENT_ID=tu_client_id
TIENDANUBE_CLIENT_SECRET=tu_client_secret
```

### **Configurar Webhook en Twilio**
```
1. Ve a: https://console.twilio.com
2. Sandbox > WhatsApp Sandbox
3. Webhook URL: https://tu-tunel.loca.lt/api/whatsapp/webhook
4. Method: POST
```

### **Opciones de Túnel Público**
```
Opción 1 - LocalTunnel (Gratis):
npm install -g localtunnel
lt --port 3000

Opción 2 - ngrok (Requiere cuenta):
ngrok http 3000
```

---

## **🎮 TESTING**

### **URLs de Testing**
```
- Landing: http://localhost:3000
- Onboarding: http://localhost:3000/onboarding
- Dashboard: http://localhost:3000/dashboard
- Testing APIs: http://localhost:3000/test
```

### **APIs para Testing**
```
- POST /api/whatsapp/configure - Configurar WhatsApp
- POST /api/whatsapp/send-welcome - Enviar mensaje de bienvenida
- POST /api/tiendanube/oauth/connect - Iniciar OAuth con Tienda Nube
- POST /api/whatsapp/webhook - Webhook para mensajes (desarrollo)
```

### **Testear Agentes**
```
Ir a: http://localhost:3000/test
- Test Analytics: Probar agente de analytics
- Test Marketing: Probar agente de marketing
- Test Customer Service: Probar agente de atención
- WhatsApp Simulation: Simular mensajes de WhatsApp
```

---

## **🔄 FLUJO COMPLETO**

### **Para Usuarios Nuevos:**
```
1. 🏠 Landing Page → Mostrar beneficios de Fini AI
2. 🔐 Auth/Register → Crear cuenta o iniciar sesión
3. ⚙️ Onboarding → Configurar tienda + WhatsApp (3 pasos)
4. 💬 WhatsApp → Toda la gestión por mensaje
```

### **Para Usuarios Existentes:**
```
1. 🔐 Login → Autenticación
2. 📱 Dashboard → Ver estado (opcional)
3. 💬 WhatsApp → Gestión directa por mensajes
```

---

## **🚨 CAMBIOS PRINCIPALES**

### **✅ LO QUE CAMBIÓ**
- **WhatsApp-Centric**: Todo se gestiona por WhatsApp
- **Dashboard Simplificado**: Solo para configuración inicial
- **Conexión Real**: Conectar tiendas reales, no automática
- **Multi-números**: Varios números de WhatsApp por usuario
- **Onboarding Mejorado**: Flujo guiado de 3 pasos
- **Agentes Inteligentes**: Keywords mejoradas para mejor detección

### **🎯 BENEFICIOS**
- **Más Natural**: Los usuarios prefieren WhatsApp
- **Sin Apps**: No necesita estar en el dashboard
- **Multi-usuario**: Varios números del negocio
- **Testing Real**: Conecta tiendas reales para probar
- **Escalable**: Fácil de usar para cualquier tamaño de negocio

---

## **📋 CHECKLIST DE CONFIGURACIÓN**

### **✅ Pre-requisitos**
- [ ] Cuenta de Twilio con WhatsApp habilitado
- [ ] Tienda de Tienda Nube (real o demo)
- [ ] Túnel público configurado (localtunnel/ngrok)
- [ ] Variables de entorno configuradas

### **✅ Configuración**
- [ ] Servidor corriendo en puerto 3000
- [ ] Túnel público funcionando
- [ ] Webhook configurado en Twilio
- [ ] Números de WhatsApp agregados
- [ ] Mensaje de prueba enviado

### **✅ Testing**
- [ ] Login funciona
- [ ] Onboarding completo
- [ ] WhatsApp recibe/envía mensajes
- [ ] Agentes responden correctamente
- [ ] Dashboard muestra estado

---

## **🆘 SOLUCIÓN DE PROBLEMAS**

### **No recibo mensajes de WhatsApp**
```
1. Verificar webhook URL en Twilio
2. Verificar que el túnel esté funcionando
3. Verificar que el número esté configurado
4. Revisar logs del servidor
```

### **Agentes no responden bien**
```
1. Verificar que las keywords estén actualizadas
2. Usar mensajes más específicos
3. Probar con /test para debug
4. Revisar logs de [AGENT:tipo]
```

### **OAuth de Tienda Nube falla**
```
1. Verificar CLIENT_ID y CLIENT_SECRET
2. Usar modo demo como fallback
3. Verificar URL de callback
4. Revisar logs de [TIENDANUBE-OAUTH]
```

---

## **🎉 ¡LISTO PARA USAR!**

Tu asistente de IA está configurado. Ahora puedes:

1. **Enviar mensajes por WhatsApp** al +14065002249
2. **Gestionar tu tienda** completamente por mensaje
3. **Obtener analytics, marketing y soporte** 24/7
4. **Escalar tu negocio** con IA conversacional

**¡Prueba enviando: "Hola Fini, ¿cuáles fueron mis ventas ayer?"** 📈 