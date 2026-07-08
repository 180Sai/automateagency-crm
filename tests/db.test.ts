import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../src/db/schema';

// Test database connection (adjust URL as needed for CI/local testing)
const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/automateagency_crm_test';

let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

describe('Customer Database Schema', () => {
  beforeAll(async () => {
    client = postgres(TEST_DATABASE_URL);
    db = drizzle(client, { schema });

    // Ensure the customers table exists
    await client.unsafe(
      `CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, phone_number VARCHAR(50) NOT NULL);`
    );
    await client.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS email_idx ON customers (email);`
    );
  });

  afterAll(async () => {
    // Clean up test table
    await client.unsafe('DROP TABLE IF EXISTS customers CASCADE');
    await client.end();
  });

  // Clean data between tests
  afterEach(async () => {
    await client.unsafe('DELETE FROM customers');
  });

  it('should have correct schema structure', () => {
    expect(schema.customers).toBeDefined();
    const columns = schema.customers.column;
    expect(columns.id).toBeDefined();
    expect(columns.name).toBeDefined();
    expect(columns.email).toBeDefined();
    expect(columns.phoneNumber).toBeDefined();
  });

  it('should insert a new customer', async () => {
    const newCustomer = {
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '+1-555-123-4567',
    };

    const [inserted] = await db
      .insert(schema.customers)
      .values(newCustomer)
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toBeGreaterThan(0);
    expect(inserted.name).toBe('John Doe');
    expect(inserted.email).toBe('john@example.com');
    expect(inserted.phoneNumber).toBe('+1-555-123-4567');
  });

  it('should retrieve all customers', async () => {
    await db.insert(schema.customers).values([
      { name: 'Alice', email: 'alice@test.com', phoneNumber: '111-111-1111' },
      { name: 'Bob', email: 'bob@test.com', phoneNumber: '222-222-2222' },
    ]);

    const customers = await db.select().from(schema.customers);

    expect(customers).toBeDefined();
    expect(customers.length).toBe(2);
    expect(customers[0].name).toBe('Alice');
    expect(customers[1].name).toBe('Bob');
  });

  it('should find a customer by id', async () => {
    const [inserted] = await db
      .insert(schema.customers)
      .values({ name: 'Charlie', email: 'charlie@test.com', phoneNumber: '333-333-3333' })
      .returning();

    const [found] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, inserted.id));

    expect(found).toBeDefined();
    expect(found.name).toBe('Charlie');
    expect(found.email).toBe('charlie@test.com');
  });

  it('should update a customer\'s details', async () => {
    const [inserted] = await db
      .insert(schema.customers)
      .values({ name: 'David', email: 'david@test.com', phoneNumber: '444-444-4444' })
      .returning();

    const [updated] = await db
      .update(schema.customers)
      .set({ name: 'David Updated', phoneNumber: '555-555-5555' })
      .where(eq(schema.customers.id, inserted.id))
      .returning();

    expect(updated.name).toBe('David Updated');
    expect(updated.phoneNumber).toBe('555-555-5555');
    expect(updated.email).toBe('david@test.com'); // unchanged
  });

  it('should delete a customer', async () => {
    const [inserted] = await db
      .insert(schema.customers)
      .values({ name: 'Eve', email: 'eve@test.com', phoneNumber: '666-666-6666' })
      .returning();

    await db.delete(schema.customers).where(eq(schema.customers.id, inserted.id));

    const remaining = await db.select().from(schema.customers);
    expect(remaining.length).toBe(0);
  });

  it('should enforce unique email constraint', async () => {
    const customer1 = { name: 'Frank', email: 'frank@unique.com', phoneNumber: '777-777-7777' };
    const customer2 = { name: 'Frank Dup', email: 'frank@unique.com', phoneNumber: '888-888-8888' };

    await db.insert(schema.customers).values(customer1);

    // Attempt to insert duplicate email
    await expect(
      db.insert(schema.customers).values(customer2)
    ).rejects.toThrow();
  });

  it('should not allow null name', async () => {
    await expect(
      db.insert(schema.customers).values({
        name: null as unknown as string,
        email: 'noname@test.com',
        phoneNumber: '999-999-9999',
      })
    ).rejects.toThrow();
  });

  it('should not allow null email', async () => {
    await expect(
      db.insert(schema.customers).values({
        name: 'No Email',
        email: null as unknown as string,
        phoneNumber: '000-000-0000',
      })
    ).rejects.toThrow();
  });
});
