import { Component } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { AppLayout, ProtectedRoute } from './components.jsx';
import { LoginPage } from './pages.jsx';
import { CustomersPage, DashboardPage, InventoryPage, InvoicesPage, OrdersPage, ProductsPage, ReportsPage } from './modules.jsx';
class AppErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <main className="app-error"><h1>Nova ERP could not load</h1><p>{this.state.error.message || 'An unexpected application error occurred.'}</p><button className="primary-button" onClick={() => window.location.assign('/login')}>Return to sign in</button></main>;
    return this.props.children;
  }
}
export default function App() { return <AppErrorBoundary><AuthProvider><BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}><Route path="/" element={<DashboardPage />} /><Route path="/orders" element={<OrdersPage />} /><Route path="/customers" element={<ProtectedRoute roles={['SALES_REP', 'SALES_MANAGER']}><CustomersPage /></ProtectedRoute>} /><Route path="/products" element={<ProductsPage />} /><Route path="/inventory" element={<ProtectedRoute roles={['SALES_MANAGER', 'WAREHOUSE']}><InventoryPage /></ProtectedRoute>} /><Route path="/invoices" element={<ProtectedRoute roles={['SALES_MANAGER', 'FINANCE']}><InvoicesPage /></ProtectedRoute>} /><Route path="/reports" element={<ProtectedRoute roles={['SALES_MANAGER', 'FINANCE']}><ReportsPage /></ProtectedRoute>} /></Route></Routes></BrowserRouter></AuthProvider></AppErrorBoundary>; }
