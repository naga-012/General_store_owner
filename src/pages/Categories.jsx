import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, RefreshCw, FolderPlus, X, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const Categories = () => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setImage('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setImage(cat.image || '');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        const res = await api.put(`/categories/${editingCategory._id}`, {
          name: name.trim(),
          description: description.trim(),
          image: image.trim(),
        });
        if (res.data.success) {
          toast.success('Category updated successfully.');
          fetchCategories();
          setModalOpen(false);
        }
      } else {
        const res = await api.post('/categories', {
          name: name.trim(),
          description: description.trim(),
          image: image.trim(),
        });
        if (res.data.success) {
          toast.success('Category created successfully.');
          fetchCategories();
          setModalOpen(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Are you sure you want to delete "${catName}"?`)) return;
    try {
      const res = await api.delete(`/categories/${id}`);
      if (res.data.success) {
        toast.success('Category deleted successfully.');
        setCategories((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Store Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize products into categories visible on the Customer Store
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-slate-500">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-6">
          <Tags className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No categories found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add your store's aisles and product sections to help customers shop easily.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Category</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((c) => (
            <div
              key={c._id}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover-lift flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                    🏷️
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c._id, c.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {c.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Slug: {c.slug}</span>
                <span className="text-emerald-600 font-semibold">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rice & Grains, Pulses, Cooking Oil"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of items in this category..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
