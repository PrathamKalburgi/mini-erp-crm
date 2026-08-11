import { PrismaClient, UserRole, CustomerType, CustomerStatus, ChallanStatus, StockMovementType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting idempotent database seed...');

  // 1. Seed Users (Mandatory test credentials per IMPLEMENTATION_PLAN.md)
  const passwordHashAdmin = await bcrypt.hash('Admin@123', 10);
  const passwordHashSales = await bcrypt.hash('Sales@123', 10);
  const passwordHashWarehouse = await bcrypt.hash('Warehouse@123', 10);
  const passwordHashAccounts = await bcrypt.hash('Accounts@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fundsroom.com' },
    update: { password_hash: passwordHashAdmin, role: UserRole.ADMIN },
    create: {
      email: 'admin@fundsroom.com',
      password_hash: passwordHashAdmin,
      role: UserRole.ADMIN,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@fundsroom.com' },
    update: { password_hash: passwordHashSales, role: UserRole.SALES },
    create: {
      email: 'sales@fundsroom.com',
      password_hash: passwordHashSales,
      role: UserRole.SALES,
    },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: 'warehouse@fundsroom.com' },
    update: { password_hash: passwordHashWarehouse, role: UserRole.WAREHOUSE },
    create: {
      email: 'warehouse@fundsroom.com',
      password_hash: passwordHashWarehouse,
      role: UserRole.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.upsert({
    where: { email: 'accounts@fundsroom.com' },
    update: { password_hash: passwordHashAccounts, role: UserRole.ACCOUNTS },
    create: {
      email: 'accounts@fundsroom.com',
      password_hash: passwordHashAccounts,
      role: UserRole.ACCOUNTS,
    },
  });

  console.log('[SEED] Seeded 4 user accounts with hashed credentials.');

  // 2. Seed Customers
  const customer1 = await prisma.customer.upsert({
    where: { id: 1 },
    update: {
      customer_name: 'Acme Logistics Ltd',
      mobile_number: '+919876543210',
      email: 'contact@acmelogistics.example',
      business_name: 'Acme Logistics India Pvt Ltd',
      gst_number: '27AAAAA0000A1Z5',
      customer_type: CustomerType.WHOLESALE,
      address: 'Plot 42, Industrial Area, Sector 62, Noida, UP',
      status: CustomerStatus.ACTIVE,
      follow_up_date: new Date('2026-08-20'),
      notes: 'Key wholesale account for regional distribution.',
    },
    create: {
      customer_name: 'Acme Logistics Ltd',
      mobile_number: '+919876543210',
      email: 'contact@acmelogistics.example',
      business_name: 'Acme Logistics India Pvt Ltd',
      gst_number: '27AAAAA0000A1Z5',
      customer_type: CustomerType.WHOLESALE,
      address: 'Plot 42, Industrial Area, Sector 62, Noida, UP',
      status: CustomerStatus.ACTIVE,
      follow_up_date: new Date('2026-08-20'),
      notes: 'Key wholesale account for regional distribution.',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 2 },
    update: {
      customer_name: 'Retail Hub Retailers',
      mobile_number: '+919876543211',
      email: 'support@retailhub.example',
      business_name: 'Retail Hub Enterprises',
      gst_number: null,
      customer_type: CustomerType.RETAIL,
      address: 'Shop 12, Commercial Complex, MG Road, Pune, MH',
      status: CustomerStatus.ACTIVE,
      follow_up_date: new Date('2026-08-25'),
      notes: 'Walk-in retail buyer.',
    },
    create: {
      customer_name: 'Retail Hub Retailers',
      mobile_number: '+919876543211',
      email: 'support@retailhub.example',
      business_name: 'Retail Hub Enterprises',
      gst_number: null,
      customer_type: CustomerType.RETAIL,
      address: 'Shop 12, Commercial Complex, MG Road, Pune, MH',
      status: CustomerStatus.ACTIVE,
      follow_up_date: new Date('2026-08-25'),
      notes: 'Walk-in retail buyer.',
    },
  });

  console.log('[SEED] Seeded demo customers.');

  // 3. Seed Products
  const product1 = await prisma.product.upsert({
    where: { sku: 'PROD-WID-001' },
    update: {
      product_name: 'Heavy Duty Steel Industrial Widget',
      category: 'Hardware',
      unit_price: 150.0,
      current_stock: 100,
      minimum_stock_alert_quantity: 15,
      warehouse_location: 'Warehouse A - Shelf 04',
    },
    create: {
      product_name: 'Heavy Duty Steel Industrial Widget',
      sku: 'PROD-WID-001',
      category: 'Hardware',
      unit_price: 150.0,
      current_stock: 100,
      minimum_stock_alert_quantity: 15,
      warehouse_location: 'Warehouse A - Shelf 04',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: 'PROD-GAD-002' },
    update: {
      product_name: 'Precision Digital Electronics Gadget',
      category: 'Electronics',
      unit_price: 450.5,
      current_stock: 50,
      minimum_stock_alert_quantity: 10,
      warehouse_location: 'Warehouse B - Shelf 02',
    },
    create: {
      product_name: 'Precision Digital Electronics Gadget',
      sku: 'PROD-GAD-002',
      category: 'Electronics',
      unit_price: 450.5,
      current_stock: 50,
      minimum_stock_alert_quantity: 10,
      warehouse_location: 'Warehouse B - Shelf 02',
    },
  });

  const product3 = await prisma.product.upsert({
    where: { sku: 'PROD-ACC-003' },
    update: {
      product_name: 'Universal Mounting Bracket Accessory',
      category: 'Accessories',
      unit_price: 25.0,
      current_stock: 200,
      minimum_stock_alert_quantity: 30,
      warehouse_location: 'Warehouse A - Shelf 10',
    },
    create: {
      product_name: 'Universal Mounting Bracket Accessory',
      sku: 'PROD-ACC-003',
      category: 'Accessories',
      unit_price: 25.0,
      current_stock: 200,
      minimum_stock_alert_quantity: 30,
      warehouse_location: 'Warehouse A - Shelf 10',
    },
  });

  console.log('[SEED] Seeded demo products.');

  // 4. Seed Initial Stock Movements (idempotent lookup)
  const existingMovement = await prisma.stockMovement.findFirst({
    where: { product_id: product1.id, reason: 'Initial warehouse stock count' },
  });

  if (!existingMovement) {
    await prisma.stockMovement.create({
      data: {
        product_id: product1.id,
        quantity_changed: 100,
        movement_type: StockMovementType.IN,
        reason: 'Initial warehouse stock count',
        created_by_user_id: warehouseUser.id,
      },
    });
  }

  // 5. Seed Sample Sales Challans
  const sampleChallan = await prisma.salesChallan.upsert({
    where: { challan_number: 'CHL-000001' },
    update: {
      customer_id: customer1.id,
      total_quantity: 5,
      status: ChallanStatus.DRAFT,
      created_by_user_id: salesUser.id,
    },
    create: {
      challan_number: 'CHL-000001',
      customer_id: customer1.id,
      total_quantity: 5,
      status: ChallanStatus.DRAFT,
      created_by_user_id: salesUser.id,
      items: {
        create: [
          {
            product_id: product1.id,
            snapshot_product_name: product1.product_name,
            snapshot_sku: product1.sku,
            snapshot_unit_price: product1.unit_price,
            snapshot_category: product1.category,
            quantity: 3,
          },
          {
            product_id: product2.id,
            snapshot_product_name: product2.product_name,
            snapshot_sku: product2.sku,
            snapshot_unit_price: product2.unit_price,
            snapshot_category: product2.category,
            quantity: 2,
          },
        ],
      },
    },
  });

  console.log('[SEED] Seeded sample draft sales challan:', sampleChallan.challan_number);

  // Sync PostgreSQL sequence counters for auto-increment IDs
  const tables = ['users', 'customers', 'customer_follow_up_notes', 'products', 'stock_movements', 'sales_challans', 'sales_challan_items'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
    );
  }

  // Sync sales_challan_number_seq sequence so nextval does not conflict with seeded challan numbers
  await prisma.$executeRawUnsafe(
    `SELECT setval('sales_challan_number_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(challan_number FROM 5) AS INTEGER)) FROM sales_challans), 1));`
  );

  console.log('[SEED] Synchronized auto-increment sequence counters and sales_challan_number_seq.');
  console.log('[SEED] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
