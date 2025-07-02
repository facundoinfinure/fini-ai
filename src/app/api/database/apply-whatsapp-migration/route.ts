import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST() {
  try {
    console.log('[INFO] Applying WhatsApp numbers migration');

    // Leer el archivo de migración
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '003_add_whatsapp_numbers_architecture.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({
        success: false,
        error: 'Migration file not found'
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('[INFO] Executing migration SQL...');
    
    // Ejecutar la migración
    const { data, error } = await supabaseAdmin.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      console.error('[ERROR] Migration failed:', error);
      
      // Si el RPC no está disponible, intentar con consultas SQL directas
      try {
        console.log('[INFO] Trying direct SQL execution...');
        
        // Dividir el SQL en comandos individuales
        const sqlCommands = migrationSQL
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0);

        console.log(`[INFO] Executing ${sqlCommands.length} SQL commands...`);

        for (const command of sqlCommands) {
          if (command.toLowerCase().includes('create table') || 
              command.toLowerCase().includes('create index') ||
              command.toLowerCase().includes('create policy') ||
              command.toLowerCase().includes('alter table') ||
              command.toLowerCase().includes('create trigger')) {
            
            console.log(`[INFO] Executing: ${command.substring(0, 50)}...`);
            
            const { error: cmdError } = await supabaseAdmin
              .from('__temp__')
              .select('1')
              .limit(0);
            
            // Esto va a fallar, pero necesitamos otro enfoque
          }
        }

        return NextResponse.json({
          success: false,
          error: 'Manual migration required',
          message: 'Please apply the migration manually in Supabase dashboard',
          migrationPath: '003_add_whatsapp_numbers_architecture.sql'
        });

      } catch (directError) {
        console.error('[ERROR] Direct SQL execution failed:', directError);
        return NextResponse.json({
          success: false,
          error: 'Migration execution failed',
          details: error.message
        }, { status: 500 });
      }
    }

    console.log('[INFO] Migration applied successfully');

    // Verificar que las tablas se crearon correctamente
    const { data: tables, error: verifyError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['whatsapp_numbers', 'whatsapp_store_connections', 'whatsapp_conversations', 'whatsapp_messages']);

    if (verifyError) {
      console.warn('[WARNING] Could not verify tables:', verifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp migration applied successfully',
      data,
      tables_created: tables?.map(t => t.table_name) || []
    });

  } catch (error) {
    console.error('[ERROR] Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 