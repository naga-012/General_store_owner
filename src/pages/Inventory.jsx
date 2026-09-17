import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  RefreshCw,
  Edit3,
  TrendingDown,
  Package,
} from 'lucide-react';
import api, { getFullImageUrl } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const Inventory = () => {
  const { productUpdateEvent } = useSocket();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, low, out, healthy

  // Quick stock edit state: { [productId]: { [unit]: stockValue } }
  const [editingStock, setEditingStock] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products?includeInactive=true&limit=200');
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [productUpdateEvent]);

  // Flatten products into variant rows for granular inventory management
  const inventoryRows = [];
  products.forEach((prod) => {
    const threshold = prod.lowStockThreshold !== undefined ? prod.lowStockThreshold : 10;
    (prod.variants || []).forEach((v) => {
      let stockStatus = 'healthy';
      if (v.stock === 0) stockStatus = 'out';
      else if (v.stock <= threshold) stockStatus = 'low';

      inventoryRows.push({
        productId: prod._id,
        productName: prod.name,
        categoryName: prod.category?.name || 'General',
        image: prod.image,
        unit: v.unit,
        price: v.price,
        currentStock: v.stock,
        threshold,
        status: prod.status,
        stockStatus,
        allVariants: prod.variants,
      });
    });
  });

  // Filter rows
  const filteredRows = inventoryRows.filter((row) => {
    const matchSearch =
      !search.trim() ||
      row.productName.toLowerCase().includes(search.toLowerCase()) ||
      row.unit.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === 'all' || row.stockStatus === statusFilter;

    return matchSearch && matchStatus;
  });

  // Handle stock input change
  const handleStockInputChange = (productId, unit, val) => {
    setEditingStock((prev) => ({
      ...prev,
      [`${productId}-${unit}`]: val,
    }));
  };

  // Save updated stock for a product variant
  const handleSaveStock = async (row) => {
    const key = `${row.productId}-${row.unit}`;
    const newStockStr = editingStock[key];
    if (newStockStr === undefined || newStockStr === '') return;

    const newStock = Number(newStockStr);
    if (isNaN(newStock) || newStock < 0) {
      toast.error('Stock must be a non-negative number.');
      return;
    }

    setSavingProductId(key);
    try {
      // Find the parent product and update its variants
      const prod = products.find((p) => p._id === row.productId);
      if (!prod) return;

      const updatedVariants = prod.variants.map((v) =>
        v.unit === row.unit ? { ...v.toObject ? v.toObject() : v, stock: newStock } : v
      );

      const res = await api.put(`/products/${row.productId}`, {
        variants: updatedVariants,
      });

      if (res.data.success) {
        toast.success(`✓ Updated ${row.productName} (${row.unit}) stock to ${newStock}.`);
        setProducts((prev) =>
          prev.map((p) => (p._id === row.productId ? res.data.product : p))
        );
        // Clear editing state for this key
        setEditingStock((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      }
    } catch (err) {
      toast.error('Failed to update stock');
    } finally {
      setSavingProductId(null);
    }
  };

  const totalOutOfStock = inventoryRows.filter((r) => r.stockStatus === 'out').length;
  const totalLowStock = inventoryRows.filter((r) => r.stockStatus === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inventory & Stock Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor and update variant stock levels in real time
          </p>
        </div>

        <button
          onClick={fetchProducts}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* KPI Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter === 'all'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-xs font-medium text-slate-500">Total Tracked Variants</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{inventoryRows.length}</div>
        </div>

        <div
          onClick={() => setStatusFilter('low')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter === 'low'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">⚠️ Low Stock Items</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Needs Restock
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{totalLowStock}</div>
        </div>

        <div
          onClick={() => setStatusFilter('out')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter === 'out'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800">❌ Out of Stock</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Unavailable
            </span>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">{totalOutOfStock}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or unit..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-slate-500 font-medium">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs"
          >
            <option value="all">All Items</option>
            <option value="healthy">In Stock Only</option>
            <option value="low">Low Stock Only (≤10)</option>
            <option value="out">Out of Stock Only (0)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table (Requirement 22) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-4">Selling Unit</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Available Stock</th>
                <th className="py-3.5 px-4 text-center">Stock Status</th>
                <th className="py-3.5 px-6 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRows.map((row) => {
                const key = `${row.productId}-${row.unit}`;
                const isEditing = editingStock[key] !== undefined;
                const inputValue = isEditing ? editingStock[key] : row.currentStock;
                const isSaving = savingProductId === key;

                return (
                  <tr key={key} className="hover:bg-slate-50/70 transition">
                    {/* Product Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {row.image ? (
                            <img
                              src={getFullImageUrl(row.image)}
                              alt={row.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs sm:text-sm">
                            {row.productName}
                          </div>
                          <span className="text-[10px] text-slate-400">{row.categoryName}</span>
                        </div>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-4 px-4 font-bold text-slate-700 text-xs sm:text-sm">
                      {row.unit}
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 font-bold text-slate-900 text-xs sm:text-sm">
                      ₹{row.price}
                    </td>

                    {/* Available Stock */}
                    <td className="py-4 px-4">
                      <span className="font-black text-slate-800 text-sm sm:text-base">
                        {row.currentStock}
                      </span>
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-4 px-4 text-center">
                      {row.stockStatus === 'out' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          ❌ Out of Stock
                        </span>
                      ) : row.stockStatus === 'low' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          ⚠️ Low Stock
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ In Stock
                        </span>
                      )}
                    </td>

                    {/* Inline stock adjustment */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          value={inputValue}
                          onChange={(e) => handleStockInputChange(row.productId, row.unit, e.target.value)}
                          className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={() => handleSaveStock(row)}
                          disabled={!isEditing || isSaving}
                          className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            isEditing
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title="Save stock change"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
