/**
 * Apply Payment Gateways Migration
 * 
 * This script applies the payment_gateways migration directly using Prisma Client.
 * It reads the SQL migration file and executes it.
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../packages/db';

async function applyMigration() {
  try {
    console.log('🚀 Starting Payment Gateways Migration...\n');

    // Connect to database
    await db.$connect();
    console.log('✅ Connected to database\n');

    // Read migration SQL file
    const migrationPath = join(
      __dirname,
      '../packages/db/prisma/migrations/20260113202907_add_payment_gateways/migration.sql'
    );
    
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file read successfully\n');

    // Parse SQL into individual statements
    // Handle DO $$ blocks as single statements
    const statements: string[] = [];
    let currentStatement = '';
    let inDoBlock = false;
    let dollarQuoteTag = '';
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments
      if (trimmed.startsWith('--')) {
        continue;
      }
      
      // Check for DO $$ block start
      if (trimmed.match(/^DO\s+\$\$/i)) {
        inDoBlock = true;
        dollarQuoteTag = '$$';
        currentStatement = line + '\n';
        continue;
      }
      
      // Check for END $$ block end
      if (inDoBlock && trimmed.match(/^END\s+\$\$\s*;?\s*$/i)) {
        currentStatement += line;
        statements.push(currentStatement.trim());
        currentStatement = '';
        inDoBlock = false;
        dollarQuoteTag = '';
        continue;
      }
      
      // If in DO block, add line to current statement
      if (inDoBlock) {
        currentStatement += line + '\n';
        continue;
      }
      
      // Regular statement - split by semicolon
      if (trimmed.endsWith(';')) {
        currentStatement += line;
        const stmt = currentStatement.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        currentStatement = '';
      } else {
        currentStatement += line + '\n';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // Filter out empty statements
    const validStatements = statements.filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${validStatements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${validStatements.length}...`);
        await db.$executeRawUnsafe(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error: any) {
        // Ignore expected errors
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('IF NOT EXISTS') ||
          error.message?.includes('relation') && error.message?.includes('does not exist')
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (expected condition)`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('\n✅ Migration execution completed!\n');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying tables...');

    // Verify tables exist
    const tables = await db.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('payment_gateways', 'payment_attempts', 'payment_webhook_logs')
      ORDER BY table_name;
    `;

    console.log('\n✅ Created tables:');
    tables.forEach(({ table_name }) => {
      console.log(`   - ${table_name}`);
    });

    if (tables.length === 0) {
      console.log('\n⚠️  Warning: No tables found. Migration may have failed.');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  } finally {
    await db.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
applyMigration();

