#!/usr/bin/env node

/**
 * Script para aplicar migraciones a Supabase
 * Ejecutar con: node scripts/apply-migrations.js
 */

const fs = require('fs');
const path = require('path');

// Variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[ERROR] Variables de entorno requeridas:');
  console.error('NEXT_PUBLIC_SUPABASE_URL');
  console.error('SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigrations() {
  try {
    console.log('[INFO] Aplicando migraciones a Supabase...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240101000000_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir el SQL en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`[INFO] Encontrados ${statements.length} statements SQL`);
    
    // Aplicar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`[INFO] Ejecutando statement ${i + 1}/${statements.length}...`);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
          },
          body: JSON.stringify({
            sql: statement
          })
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`[ERROR] Error en statement ${i + 1}:`, error);
          console.error(`[ERROR] SQL:`, statement);
        } else {
          console.log(`[SUCCESS] Statement ${i + 1} ejecutado correctamente`);
        }
      }
    }
    
    console.log('[SUCCESS] Migraciones aplicadas correctamente');
    
  } catch (error) {
    console.error('[ERROR] Error aplicando migraciones:', error);
    process.exit(1);
  }
}

// Ejecutar el script
applyMigrations(); 