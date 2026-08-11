import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));
const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const StockMovementLogPage = lazy(() => import('./pages/products/StockMovementLogPage'));
const ChallanListPage = lazy(() => import('./pages/challans/ChallanListPage'));
const ChallanFormPage = lazy(() => import('./pages/challans/ChallanFormPage'));
const ChallanDetailPage = lazy(() => import('./pages/challans/ChallanDetailPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/customers" replace />} />
                <Route path="customers" element={<CustomerListPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="products" element={<ProductListPage />} />
                <Route path="stock-movements" element={<StockMovementLogPage />} />
                <Route path="challans" element={<ChallanListPage />} />
                <Route path="challans/new" element={<ChallanFormPage />} />
                <Route path="challans/:id" element={<ChallanDetailPage />} />
                <Route path="challans/:id/edit" element={<ChallanFormPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
