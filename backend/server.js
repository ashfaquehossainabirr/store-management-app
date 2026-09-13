require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const supplierRoutes = require('./routes/suppliers');
const saleRoutes = require('./routes/sales');
const purchaseRoutes = require('./routes/purchases');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');

const app = express();
connectDB();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Store Management API running on port ${PORT}`));
