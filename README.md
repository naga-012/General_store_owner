# Manikanta Superstore — Shop Owner & Admin Website

A modern, responsive, real-time Shop Owner and Supermarket Admin portal built with React, Vite, Tailwind CSS, and Socket.IO.

It connects to the shared backend (`http://localhost:5000`) and MongoDB database (`kirana_store`) used by the customer website.

## Architecture

- **Customer Website**: `http://localhost:5173`
- **Owner Website**: `http://localhost:5174`
- **Shared Backend API**: `http://localhost:5000`
- **MongoDB**: `kirana_store`

## Features

1. **Owner Authentication & Role Verification**
   - Secure login using Email or Mobile Number.
   - Strict `admin` role validation (customers cannot access).
   - Session persistence and secure token storage.
2. **Dashboard Overview**
   - Product Metrics: Total, Active, Inactive, Low Stock, Out of Stock.
   - Order Flow: New, Accepted, Packed / Ready for Pickup, Completed, Rejected.
   - Revenue Trends: Today's Sales, Last 7 Days, This Month, Lifetime Total.
   - Interactive charts for 7-day revenue and top-selling items.
3. **Product Management**
   - Live product catalog with search, category filtering, and status filters.
   - Instant active/inactive toggling.
   - Delete products with safe confirmation modal.
4. **Dynamic Selling Units & Multi-Pricing**
   - Configure tiered pack sizes, weights, and volumes (e.g., 250g, 500g, 1kg, 5kg).
   - Custom unit inputs (e.g. "Pack of 10", "3 Liter").
   - Variant-specific prices and variant-specific inventory stocks.
   - Product image upload (JPG, PNG, WEBP) with instant preview.
5. **Inventory Manager**
   - Dedicated granular variant table.
   - Quick inline stock updates without leaving the page.
   - Color-coded stock badges: In Stock, Low Stock (≤10), and Out of Stock.
6. **Orders Workflow**
   - Live order tracking tabs: All, New, Accepted, Packed, Completed, Rejected.
   - Status transition flow:
     - `Accept Order` -> `ORDER_ACCEPTED`
     - `Pack & Ready` -> `PACKED`
     - `Mark Completed` -> `COMPLETED` (auto-deducts variant stock)
     - `Reject Order` -> with customizable reason
   - Real-time sound/toast alerts on new orders via Socket.IO.
7. **Store Settings & Profile**
   - Shop name, tagline, logo, phone, WhatsApp, address, opening/closing hours.
   - Temporary shop open/closed toggle.
   - Owner profile editor and password management.

## Getting Started

### 1. Start MongoDB & Backend
In `general store/backend`:
```bash
npm run dev
# Server starts on port 5000
```

### 2. Start Customer Website
In `general store/frontend`:
```bash
npm run dev
# Customer website starts on port 5173
```

### 3. Start Owner Website
In `general owner`:
```bash
npm run dev
# Owner website starts on port 5174
```

### 4. Admin Credentials
- **Email**: `mykalanagarjun09@gmail.com`
- **Mobile**: `9121792433`
- **Password**: `naga@012`
