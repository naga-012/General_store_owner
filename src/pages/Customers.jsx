import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Mail, MapPin, RefreshCw, ShoppingBag, IndianRupee } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const Customers = () => {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/customers');
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Registered Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Customer directory with order counts and lifetime spend
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, or mobile..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
        </div>
        <div className="text-xs text-slate-500 hidden sm:block">
          Total Customers: <strong className="text-slate-800">{customers.length}</strong>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-slate-500">Loading customers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-6">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No customers found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-6 text-right">Lifetime Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Member since {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {c.address || 'Pickup from store'}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                        {c.orderCount || 0}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-black text-slate-900">
                      ₹{(c.totalSpent || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
