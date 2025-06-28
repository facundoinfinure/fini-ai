const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('Missing Twilio credentials');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log('🔍 Verificando APIs disponibles en Twilio...\n');

console.log('✅ APIs disponibles:');
console.log('- client.content:', !!client.content);
console.log('- client.messaging:', !!client.messaging);
console.log('- client.content.v1:', !!client.content?.v1);
console.log('- client.content.v1.contents:', !!client.content?.v1?.contents);
console.log('- client.content.v1.contentAndApprovals:', !!client.content?.v1?.contentAndApprovals);
console.log('- client.messaging.v1.services:', !!client.messaging?.v1?.services);

console.log('\n🔧 Probando acceso a Content API...');

if (client.content?.v1?.contents) {
  client.content.v1.contents.list({ limit: 1 })
    .then(contents => {
      console.log('✅ Content API funciona. Templates existentes:', contents.length);
      console.log('📋 Estructura de contenido:');
      if (contents.length > 0) {
        console.log('- SID:', contents[0].sid);
        console.log('- Friendly Name:', contents[0].friendlyName);
        console.log('- Status:', contents[0].status);
        console.log('- Language:', contents[0].language);
      }
    })
    .catch(error => {
      console.error('❌ Error accediendo Content API:', error.message);
    });
} else {
  console.log('❌ Content API no disponible en esta versión');
}

console.log('\n🔧 Verificando si necesitamos usar Messaging Services...');

if (client.messaging?.v1?.services) {
  client.messaging.v1.services.list({ limit: 1 })
    .then(services => {
      console.log('✅ Messaging Services disponible. Servicios:', services.length);
    })
    .catch(error => {
      console.error('❌ Error accediendo Messaging Services:', error.message);
    });
} 