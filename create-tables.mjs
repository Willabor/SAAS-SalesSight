import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL);

const sqlScript = readFileSync('./create_warehouse_tables.sql', 'utf8');

// Split by semicolons and execute each statement
const statements = sqlScript.split(';').filter(s => s.trim());

console.log(`Executing ${statements.length} SQL statements...`);

try {
  for (const statement of statements) {
    if (statement.trim()) {
      console.log(`Executing: ${statement.trim().substring(0, 80)}...`);
      await sql(statement);
    }
  }
  console.log('✓ All tables created successfully!');
} catch (error) {
  console.error('Error creating tables:', error);
  process.exit(1);
}
