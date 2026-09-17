import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  RefreshCw,
  IndianRupee,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const { latestOrder, productUpdateEvent } = useSocket();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/admin/dashboard-stats');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [latestOrder, productUpdateEvent]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Loading Owner Dashboard...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const lowStockProducts = data?.lowStockProducts || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Store Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time supermarket metrics, inventory health & order flow
          </p>
        </div>

        <button
          onClick={fetchDashboardStats}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 1. SALES OVERVIEW CARDS */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Sales & Revenue
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Today's Sales</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-2">
              ₹{(stats.todaySales || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              Daily revenue
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">This Week</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-2">
              ₹{(stats.weekSales || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-teal-600 font-semibold mt-1 inline-block">
              Last 7 days
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">This Month</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-2">
              ₹{(stats.monthSales || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-1 inline-block">
              Current calendar month
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Lifetime Sales</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-2">
              ₹{(stats.totalSales || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-purple-600 font-semibold mt-1 inline-block">
              All completed orders
            </span>
          </div>
        </div>
      </div>

      {/* 2. ORDER BREAKDOWN & PRODUCT STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Statistics */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>Order Statistics</span>
            </h3>
            <Link
              to="/orders"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70">
              <span className="text-[11px] font-semibold text-amber-800">New Placed</span>
              <div className="text-2xl font-black text-amber-900 mt-1">{stats.newOrders || 0}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/70">
              <span className="text-[11px] font-semibold text-blue-800">Accepted</span>
              <div className="text-2xl font-black text-blue-900 mt-1">{stats.acceptedOrders || 0}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/70">
              <span className="text-[11px] font-semibold text-purple-800">Packed / Ready</span>
              <div className="text-2xl font-black text-purple-900 mt-1">{stats.packedOrders || 0}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70">
              <span className="text-[11px] font-semibold text-emerald-800">Completed</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{stats.completedOrders || 0}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/70">
              <span className="text-[11px] font-semibold text-rose-800">Rejected</span>
              <div className="text-2xl font-black text-rose-900 mt-1">{stats.rejectedOrders || 0}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-700">Total Orders</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalOrders || 0}</div>
            </div>
          </div>
        </div>

        {/* Product & Customer Statistics */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                <span>Product & Customer Stats</span>
              </h3>
              <Link
                to="/products"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">Total Products</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalProducts || 0}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70">
                <span className="text-[11px] font-semibold text-emerald-800">Active</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">{stats.activeProducts || 0}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">Inactive</span>
                <div className="text-2xl font-black text-slate-700 mt-1">{stats.inactiveProducts || 0}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/70">
                <span className="text-[11px] font-semibold text-rose-800">Out of Stock</span>
                <div className="text-2xl font-black text-rose-900 mt-1">{stats.outOfStock || 0}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70">
                <span className="text-[11px] font-semibold text-amber-800">Low Stock</span>
                <div className="text-2xl font-black text-amber-900 mt-1">{stats.lowStock || 0}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/70">
                <span className="text-[11px] font-semibold text-indigo-800">Customers</span>
                <div className="text-2xl font-black text-indigo-900 mt-1">{stats.totalCustomers || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 mb-1">Last 7 Days Revenue Trend</h3>
          <p className="text-xs text-slate-500 mb-6">Completed customer order totals</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.dailySales || []}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${val}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 mb-1">Top Selling Items</h3>
          <p className="text-xs text-slate-500 mb-6">By completed revenue</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topProducts || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${val}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="value" fill="#059669" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. LOW STOCK WARNING & RECENT ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Low Stock Alerts ({lowStockProducts.length})</span>
            </h3>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Go to Inventory
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              ✅ All product inventory levels are healthy!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {lowStockProducts.map((p) => {
                const totalStock = (p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
                return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-200/70"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Units: {p.variants?.map((v) => `${v.unit} (${v.stock})`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {totalStock} left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Recent Orders</span>
            </h3>
            <Link
              to="/orders"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View Orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No orders received yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {recentOrders.map((order) => {
                let badgeColor = 'bg-slate-100 text-slate-700';
                if (order.orderStatus === 'ORDER_PLACED') badgeColor = 'bg-amber-100 text-amber-800';
                else if (order.orderStatus === 'ORDER_ACCEPTED') badgeColor = 'bg-blue-100 text-blue-800';
                else if (order.orderStatus === 'PACKED') badgeColor = 'bg-purple-100 text-purple-800';
                else if (order.orderStatus === 'COMPLETED') badgeColor = 'bg-emerald-100 text-emerald-800';
                else if (order.orderStatus === 'REJECTED') badgeColor = 'bg-rose-100 text-rose-800';

                return (
                  <div
                    key={order._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{order.orderId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{order.customerName || 'Customer'} • ₹{order.grandTotal}</span>
                        {(order.customerAddress || order.deliveryAddress) && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                            <MapPin className="w-2.5 h-2.5 text-rose-500" />
                            <span className="truncate max-w-[160px]">{order.customerAddress || order.deliveryAddress}</span>
                          </span>
                        )}
                      </p>
                    </div>

                    <Link
                      to="/orders"
                      className="text-xs font-medium text-emerald-600 hover:underline"
                    >
                      Inspect
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
