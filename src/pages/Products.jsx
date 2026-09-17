import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Package,
  Layers,
} from 'lucide-react';
import api, { getFullImageUrl } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const Products = () => {
  const { productUpdateEvent } = useSocket();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out
  const [sortBy, setSortBy] = useState('newest');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle status loading
  const [togglingId, setTogglingId] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch including inactive products since this is the Owner portal
      const res = await api.get('/products?includeInactive=true&limit=200');
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [productUpdateEvent]);

  // Handle Toggle Status
  const handleToggleStatus = async (product) => {
    setTogglingId(product._id);
    try {
      const res = await api.patch(`/products/${product._id}/toggle-status`);
      if (res.data.success) {
        toast.success(`✓ Product marked as ${res.data.product.status}.`);
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, status: res.data.product.status } : p))
        );
      }
    } catch (err) {
      toast.error('Failed to update product status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Delete Product
  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/products/${productToDelete._id}`);
      if (res.data.success) {
        toast.success('✓ Product deleted successfully.');
        setProducts((prev) => prev.filter((p) => p._id !== productToDelete._id));
        setDeleteModalOpen(false);
        setProductToDelete(null);
      }
    } catch (err) {
      toast.error('Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Search logic
  const filteredProducts = products.filter((prod) => {
    // Search keyword
    const matchSearch =
      !search.trim() ||
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(search.toLowerCase())) ||
      (prod.variants || []).some((v) => v.unit.toLowerCase().includes(search.toLowerCase()));

    // Category
    const matchCat =
      selectedCategory === 'all' ||
      (prod.category && (prod.category._id === selectedCategory || prod.category.name === selectedCategory));

    // Status
    const matchStatus =
      statusFilter === 'all' || prod.status === statusFilter;

    // Stock
    const totalStock = (prod.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
    const threshold = prod.lowStockThreshold !== undefined ? prod.lowStockThreshold : 10;

    let matchStock = true;
    if (stockFilter === 'out') {
      matchStock = totalStock === 0;
    } else if (stockFilter === 'low') {
      matchStock = totalStock > 0 && totalStock <= threshold;
    } else if (stockFilter === 'in') {
      matchStock = totalStock > threshold;
    }

    return matchSearch && matchCat && matchStatus && matchStock;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your store's items, pricing variants, stock & visibility
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            title="Refresh product list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/products/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, unit, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition placeholder-slate-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Stock Levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock (≤10)</option>
            <option value="out">Out of Stock (0)</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredProducts.length}</strong> of{' '}
            {products.length} products
          </span>
          {(search || selectedCategory !== 'all' || statusFilter !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setStatusFilter('all');
                setStockFilter('all');
              }}
              className="text-emerald-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Product List Table / Responsive Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-slate-500">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-6">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or add a brand new item to your store catalog.
          </p>
          <Link
            to="/products/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Variants & Pricing</th>
                  <th className="py-3.5 px-4 text-center">Total Stock</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((p) => {
                  const totalStock = (p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
                  const isOutOfStock = totalStock === 0;
                  const isLowStock = totalStock > 0 && totalStock <= (p.lowStockThreshold || 10);

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition">
                      {/* Product Name & Image */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
                            {p.image ? (
                              <img
                                src={getFullImageUrl(p.image)}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=60';
                                }}
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-snug">{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Variants breakdown */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {(p.variants || []).map((v, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                                v.stock === 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {v.unit} → ₹{v.price} ({v.stock})
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Stock */}
                      <td className="py-4 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            0 (Out of stock)
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠️ {totalStock} Left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {totalStock} in stock
                          </span>
                        )}
                      </td>

                      {/* Status & Toggle switch */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          disabled={togglingId === p._id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                            p.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{p.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/products/edit/${p._id}`}
                            className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => {
                              setProductToDelete(p);
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredProducts.map((p) => {
              const totalStock = (p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
              return (
                <div key={p._id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.image ? (
                        <img
                          src={getFullImageUrl(p.image)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        {p.category?.name || 'General'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {p.status === 'active' ? '● Active' : '○ Inactive'}
                    </button>
                  </div>

                  {/* Variants */}
                  <div className="flex flex-wrap gap-1.5">
                    {(p.variants || []).map((v, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        {v.unit}: ₹{v.price} ({v.stock} in stock)
                      </span>
                    ))}
                  </div>

                  {/* Mobile Card Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Total stock:{' '}
                      <strong className={totalStock === 0 ? 'text-rose-600' : 'text-slate-800'}>
                        {totalStock}
                      </strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/products/edit/${p._id}`}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          setProductToDelete(p);
                          setDeleteModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Requirement 18) */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Delete Product</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete{' '}
                <strong className="text-slate-800">"{productToDelete?.name}"</strong>? This will remove
                it from both the Owner and Customer catalog.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
