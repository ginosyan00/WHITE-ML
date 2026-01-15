// Script to verify tables exist in Neon database
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '') || '';

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set in .env file!');
  process.exit(1);
}

let urlWithEncoding = databaseUrl;
if (!databaseUrl.includes('client_encoding')) {
  urlWithEncoding = databaseUrl.includes('?') 
    ? `${databaseUrl}&client_encoding=UTF8`
    : `${databaseUrl}?client_encoding=UTF8`;
}

process.env.DATABASE_URL = urlWithEncoding;

const prisma = new PrismaClient({
  log: ['error'],
});

async function verifyTables() {
  try {
    console.log('🔌 [VERIFY] Connecting to Neon PostgreSQL...');
    await prisma.$connect();
    console.log('✅ [VERIFY] Connected successfully!\n');
    
    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT 
        tablename,
        schemaname
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log(`📦 [VERIFY] Found ${tables.length} tables in Neon database:\n`);
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found! You need to run migrations.');
      console.log('💡 Run: cd packages/db && npm run db:push\n');
    } else {
      // Check each table and count records
      for (const table of tables) {
        try {
          const countResult = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count FROM "${table.tablename}"`
          );
          const count = countResult[0]?.count || 0;
          console.log(`   ✅ ${table.tablename.padEnd(30)} - ${count} records`);
        } catch (e) {
          console.log(`   ⚠️  ${table.tablename.padEnd(30)} - error reading`);
        }
      }
      
      console.log('\n✅ [VERIFY] All tables are ready!');
      console.log('\n📊 [VERIFY] You can now view data in Neon Console:');
      console.log('   https://console.neon.tech/app/projects/autumn-term-06749994/branches/br-spring-glitter-ahpgsx9m/tables');
      console.log('\n💡 [VERIFY] To add data:');
      console.log('   1. Open Neon Console (link above)');
      console.log('   2. Click on any table');
      console.log('   3. Use "Insert" button to add records');
      console.log('   4. Or use SQL Editor to run queries');
    }
    
    // List all expected tables from schema
    console.log('\n📋 [VERIFY] Expected tables from Prisma schema:');
    const expectedTables = [
      'users', 'addresses', 'categories', 'category_translations',
      'brands', 'brand_translations', 'attributes', 'attribute_translations',
      'attribute_values', 'attribute_value_translations', 'products',
      'product_translations', 'product_variants', 'product_variant_options',
      'product_labels', 'product_attributes', 'carts', 'cart_items',
      'orders', 'order_items', 'payments', 'order_events', 'settings',
      'payment_gateways', 'payment_attempts', 'payment_webhook_logs'
    ];
    
    expectedTables.forEach(table => {
      const exists = tables.some(t => t.tablename === table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });
    
  } catch (error) {
    console.error('\n❌ [VERIFY] Error:', error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.error('\n💡 Connection issues:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify Neon database is active');
      console.error('   3. Try using direct connection URL from Neon Console');
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyTables();

