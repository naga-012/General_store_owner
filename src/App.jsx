import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OwnerLayout from './layouts/OwnerLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AddEditProduct from './pages/AddEditProduct';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Notifications from './pages/Notifications';
import StoreSettings from './pages/StoreSettings';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Owner Routes */}
      <Route element={<OwnerLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/add" element={<AddEditProduct />} />
        <Route path="/products/edit/:id" element={<AddEditProduct />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<StoreSettings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
