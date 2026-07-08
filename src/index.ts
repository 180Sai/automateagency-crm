import { db } from './db';

async function main() {
  console.log('🚀 AutomateAgency CRM starting...');

  // Verify database connection
  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');
    console.log('📦 Schema tables ready');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // TODO: Start HTTP server (Express/Fastify/Hono) when ready
  // TODO: Register routes when added
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});