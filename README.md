# StoreFlow — Store Management System

A full-stack store / retail management application (POS, inventory, invoicing) built
for any kind of shop — grocery, general store, boutique, electronics, pharmacy, etc.
The UI look, layout, and responsive behavior follow the same design language as the
TaskFlow ERP reference app (dark/light theme, collapsible sidebar, card-based pages).

## Stack
- **Frontend:** React 18 + Vite, React Router, Axios, lucide-react icons
- **Backend:** Node.js + Express, MongoDB + Mongoose, JWT auth, PDFKit (PDF invoices)

## Features
- Email/password auth with roles: **admin**, **manager**, **cashier**
- Dashboard: today/month revenue, low-stock alerts, weekly sales chart, top products, recent sales
- **Point of Sale (POS):** searchable product grid, cart, discounts, tax, multiple payment
  methods, partial payments / store credit, instant invoice generation
- **Products & Categories:** full CRUD, SKU/barcode, stock, reorder levels, low-stock filter
- **Customers & Suppliers:** CRUD with purchase history totals
- **Purchase Orders:** create POs to suppliers, receive stock (auto-updates inventory)
- **Invoices:** searchable list, detail view, record additional payments, void/refund,
  and **download a PDF invoice** for a hard copy
- **Team & Access:** admin-only user management
- **Store Settings:** store profile, currency, tax rate, invoice number prefix
- Fully responsive: desktop, laptop, tablet, and mobile (collapsible/off-canvas sidebar)
- Light & dark theme toggle

## Project structure
```
store-app/
├── backend/     Express API + MongoDB models
└── frontend/    React (Vite) SPA
```

## Getting started

### 1. Backend
```bash
cd backend
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET
npm install
npm run seed               # optional: seed demo data + a login
npm run dev                 # http://localhost:5000
```
Seeded demo login (if you run `npm run seed`): `admin@store.com` / `admin123`

If you don't seed, the first time you open the app you'll be prompted to create
the initial admin account automatically (no signup screen shown after that).

### 2. Frontend
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

### 3. Build for production
```bash
cd frontend && npm run build     # outputs to frontend/dist
cd backend  && npm start         # or deploy with pm2 / a process manager
```

## Notes
- Stock is decremented transactionally when a sale is completed, and restored if an
  invoice is voided.
- Purchase orders add stock to inventory only once marked "received".
- Invoice numbers use the prefix configured in Store Settings (default `INV-`).
- PDF invoices are generated server-side with PDFKit and streamed as a download.
