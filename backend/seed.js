require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const StoreSettings = require('./models/StoreSettings');

async function seed() {
  await connectDB();

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create([
      { name: 'Store Admin', email: 'admin@store.com', password: 'admin123', role: 'admin', isMainAdmin: true },
      { name: 'Store Manager', email: 'manager@store.com', password: 'manager123', role: 'manager' },
      { name: 'Cashier One', email: 'cashier@store.com', password: 'cashier123', role: 'cashier' },
    ]);
    console.log('Seeded users (admin@store.com / admin123)');
  }

  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({
      storeName: 'Corner Mart',
      storeType: 'Grocery & General Store',
      address: '221B Market Street, Dhaka',
      phone: '+880 1700-000000',
      email: 'hello@cornermart.com',
      currency: 'USD',
      currencySymbol: '$',
      taxRate: 5,
      invoicePrefix: 'INV-',
      lowStockThreshold: 5,
    });
    console.log('Seeded store settings');
  }

  const categoryCount = await Category.countDocuments();
  let categories;
  if (categoryCount === 0) {
    categories = await Category.create([
      { name: 'Groceries', description: 'Everyday grocery items' },
      { name: 'Beverages', description: 'Drinks and juices' },
      { name: 'Snacks', description: 'Chips, biscuits, and snacks' },
      { name: 'Household', description: 'Cleaning and household supplies' },
      { name: 'Personal Care', description: 'Health and personal care items' },
    ]);
    console.log('Seeded categories');
  } else {
    categories = await Category.find();
  }

  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    const byName = (n) => categories.find((c) => c.name === n)._id;
    await Product.create([
      { name: 'Basmati Rice 5kg', sku: 'GRC-001', category: byName('Groceries'), unit: 'bag', costPrice: 8, sellPrice: 11.5, stock: 42, reorderLevel: 10 },
      { name: 'Cooking Oil 1L', sku: 'GRC-002', category: byName('Groceries'), unit: 'bottle', costPrice: 3, sellPrice: 4.5, stock: 60, reorderLevel: 15 },
      { name: 'Whole Wheat Flour 2kg', sku: 'GRC-003', category: byName('Groceries'), unit: 'bag', costPrice: 2.5, sellPrice: 3.8, stock: 8, reorderLevel: 10 },
      { name: 'Orange Juice 1L', sku: 'BEV-001', category: byName('Beverages'), unit: 'bottle', costPrice: 1.8, sellPrice: 2.9, stock: 35, reorderLevel: 12 },
      { name: 'Mineral Water 500ml', sku: 'BEV-002', category: byName('Beverages'), unit: 'bottle', costPrice: 0.3, sellPrice: 0.6, stock: 150, reorderLevel: 30 },
      { name: 'Potato Chips 150g', sku: 'SNK-001', category: byName('Snacks'), unit: 'pack', costPrice: 0.9, sellPrice: 1.5, stock: 5, reorderLevel: 20 },
      { name: 'Chocolate Cookies', sku: 'SNK-002', category: byName('Snacks'), unit: 'pack', costPrice: 1.2, sellPrice: 2.0, stock: 24, reorderLevel: 10 },
      { name: 'Dish Washing Liquid', sku: 'HSE-001', category: byName('Household'), unit: 'bottle', costPrice: 1.5, sellPrice: 2.4, stock: 18, reorderLevel: 8 },
      { name: 'Laundry Detergent 3kg', sku: 'HSE-002', category: byName('Household'), unit: 'box', costPrice: 4.5, sellPrice: 6.9, stock: 14, reorderLevel: 6 },
      { name: 'Toothpaste 100g', sku: 'PC-001', category: byName('Personal Care'), unit: 'tube', costPrice: 1.1, sellPrice: 1.8, stock: 3, reorderLevel: 15 },
    ]);
    console.log('Seeded products');
  }

  const customerCount = await Customer.countDocuments();
  if (customerCount === 0) {
    await Customer.create([
      { name: 'Walk-in Customer', phone: '', email: '' },
      { name: 'Rashid Khan', phone: '+880 1711-223344', email: 'rashid@example.com', address: 'Gulshan, Dhaka' },
      { name: 'Ayesha Rahman', phone: '+880 1822-556677', email: 'ayesha@example.com', address: 'Banani, Dhaka' },
    ]);
    console.log('Seeded customers');
  }

  const supplierCount = await Supplier.countDocuments();
  if (supplierCount === 0) {
    await Supplier.create([
      { name: 'Golden Harvest Distributors', contactPerson: 'Kamal Hasan', phone: '+880 1911-334455', email: 'sales@goldenharvest.com', address: 'Tejgaon, Dhaka' },
      { name: 'FreshFlow Beverages', contactPerson: 'Nadia Islam', phone: '+880 1955-667788', email: 'orders@freshflow.com', address: 'Mirpur, Dhaka' },
    ]);
    console.log('Seeded suppliers');
  }

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
