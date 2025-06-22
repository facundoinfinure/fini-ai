// Configuración de variables de entorno para verificación
// Este archivo contiene solo los nombres de las variables, no los valores

module.exports = {
  database: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  auth: [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ],
  tiendanube: [
    'TIENDANUBE_CLIENT_ID',
    'TIENDANUBE_CLIENT_SECRET',
    'TIENDANUBE_REDIRECT_URI'
  ],
  whatsapp: [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ],
  optional: [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ]
}; 