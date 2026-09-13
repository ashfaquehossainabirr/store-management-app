import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import POS from './pages/POS';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Suppliers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Purchases />
          </ProtectedRoute>
        }
      />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  );
}
