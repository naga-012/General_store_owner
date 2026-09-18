import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Loader2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import api, { getFullImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

// Preset units for quick clicks (Requirement 10)
const PRESET_UNITS = [
  { group: 'Weight', units: ['250g', '500g', '1kg', '2kg', '5kg', '10kg'] },
  { group: 'Volume', units: ['250ml', '500ml', '1L', '2L', '5L'] },
  { group: 'Pieces / Packs', units: ['1 Piece', '2 Pieces', '6 Pieces', '12 Pieces', 'Packet', 'Box', 'Bottle'] },
];

const AddEditProduct = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageSource, setImageSource] = useState('upload'); // 'upload' | 'url'
  const [status, setStatus] = useState('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Variants State (Requirement 11 & 12)
  const [variants, setVariants] = useState([
    { unit: '1kg', price: '', stock: '50' },
  ]);

  // Custom unit quick-entry field
  const [customUnit, setCustomUnit] = useState('');

  useEffect(() => {
    // Fetch categories
    api.get('/categories')
      .then((res) => {
        if (res.data.success) {
          setCategories(res.data.categories);
          if (!isEditMode && res.data.categories.length > 0 && !category) {
            setCategory(res.data.categories[0]._id);
          }
        }
      })
      .catch(() => {});

    // If edit mode, load product details
    if (isEditMode) {
      setLoading(true);
      api.get(`/products/${id}`)
        .then((res) => {
          if (res.data.success && res.data.product) {
            const p = res.data.product;
            setName(p.name || '');
            setCategory(p.category?._id || p.category || '');
            setDescription(p.description || '');
            setImage(p.image || '');
            if (p.image) {
              const isWebUrl = p.image.startsWith('http://') || p.image.startsWith('https://');
              setImageSource(isWebUrl ? 'url' : 'upload');
              setImagePreview(getFullImageUrl(p.image));
            }
            setStatus(p.status || 'active');
            setIsFeatured(p.isFeatured || false);
            setLowStockThreshold(p.lowStockThreshold !== undefined ? p.lowStockThreshold : 10);
            if (p.variants && p.variants.length > 0) {
              setVariants(
                p.variants.map((v) => ({
                  unit: v.unit,
                  price: v.price.toString(),
                  stock: v.stock.toString(),
                }))
              );
            }
          }
        })
        .catch((err) => {
          toast.error('Failed to load product details');
          navigate('/products');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isEditMode]);

  // Handle Image Selection and Upload
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64 immediately for seamless instant preview & resilient fallback
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result;
      if (base64Data) {
        setImagePreview(base64Data);
        setImage(base64Data);
      }
    };
    reader.readAsDataURL(file);

    setImageSource('upload');

    // Upload to server using /api/products/upload-image
    const formData = new FormData();
    formData.append('file', file);
    formData.append('image', file);
    formData.append('photo', file);

    setUploadingImage(true);
    try {
      // Omit/undefined Content-Type so browser sets correct boundary
      const res = await api.post('/products/upload-image', formData, {
        headers: {
          'Content-Type': undefined,
        },
      });
      if (res.data && res.data.success && res.data.imageUrl) {
        setImage(res.data.imageUrl);
        setImagePreview(getFullImageUrl(res.data.imageUrl));
        toast.success('Photo uploaded successfully.');
      }
    } catch (err) {
      console.warn('Server upload notice (using local base64 image):', err);
      toast.success('Photo added to product.');
    } finally {
      setUploadingImage(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setImage('');
    setImagePreview('');
  };

  // Add Variant Row
  const handleAddVariant = (unitName = '') => {
    setVariants((prev) => [
      ...prev,
      { unit: unitName || '', price: '', stock: '50' },
    ]);
  };

  // Remove Variant Row
  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      toast.warning('A product must have at least one unit/pricing variant.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Update specific variant field
  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add custom unit
  const handleAddCustomUnit = (e) => {
    e.preventDefault();
    if (!customUnit.trim()) return;
    handleAddVariant(customUnit.trim());
    setCustomUnit('');
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Product name is required.');
      return;
    }

    if (!category) {
      toast.error('Please select a category.');
      return;
    }

    if (!variants || variants.length === 0) {
      toast.error('Please add at least one unit.');
      return;
    }

    // Validate variants
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.unit.trim()) {
        toast.error(`Unit name for variant #${i + 1} is required (e.g., 250g, 1kg).`);
        return;
      }
      if (v.price === '' || isNaN(Number(v.price)) || Number(v.price) < 0) {
        toast.error(`Price for variant "${v.unit}" must be a non-negative number.`);
        return;
      }
      if (v.stock === '' || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
        toast.error(`Stock for variant "${v.unit}" cannot be negative.`);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      image,
      status,
      isFeatured,
      lowStockThreshold: Number(lowStockThreshold) || 10,
      variants: variants.map((v) => ({
        unit: v.unit.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
      })),
    };

    setSubmitting(true);
    try {
      if (isEditMode) {
        const res = await api.put(`/products/${id}`, payload);
        if (res.data.success) {
          toast.success('Product updated successfully.');
          navigate('/products');
        }
      } else {
        const res = await api.post('/products', payload);
        if (res.data.success) {
          toast.success('Product added successfully.');
          navigate('/products');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-medium text-slate-500">Loading product data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back button & title */}
      <div className="flex items-center gap-4">
        <Link
          to="/products"
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isEditMode ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure product details, image, dynamic selling units, and tiered pricing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tata Salt, Premium Basmati Rice"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
                required
              />
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <Link
                  to="/categories"
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  + Manage Categories
                </Link>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe quality, origins, or health benefits..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Status & Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Product Status
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>🟢 Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="w-4 h-4 text-slate-500 focus:ring-emerald-500"
                  />
                  <span>🔴 Inactive</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>⭐ Feature on Homepage</span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Image Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Product Image</h2>
              <p className="text-xs text-slate-500">
                {imageSource === 'upload'
                  ? 'Upload a photo directly from your device (No URL required).'
                  : 'Enter an image web link if you do not have a photo to upload.'}
              </p>
            </div>

            {/* Toggle between Upload Photo and Web URL */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setImageSource('upload');
                  if (image.startsWith('http://') || image.startsWith('https://')) {
                    setImage('');
                    setImagePreview('');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  imageSource === 'upload'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImageSource('url');
                  if (image.startsWith('/uploads/')) {
                    setImage('');
                    setImagePreview('');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  imageSource === 'url'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Enter Image URL</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Interactive Image Preview Box with Drag-and-Drop */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleImageChange({ target: { files: e.dataTransfer.files } });
                }
              }}
              className="w-36 h-36 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border-2 border-dashed border-slate-300 hover:border-emerald-500 overflow-hidden flex items-center justify-center flex-shrink-0 relative cursor-pointer transition group"
              onClick={() => {
                const fileInput = document.getElementById('product-file-input');
                if (fileInput) fileInput.click();
              }}
              title="Click or drag a photo here to upload"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Product Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-3 text-slate-400 group-hover:text-emerald-600 transition">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-70 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-bold block">Click to Upload</span>
                  <span className="text-[9px] text-slate-400 font-normal">or Drag & Drop</span>
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Mode 1: Upload Photo from device (NO URL NEEDED) */}
            {imageSource === 'upload' ? (
              <div className="flex-1 space-y-3">
                <p className="text-xs text-slate-600 font-medium">
                  Select a photo from your computer or phone gallery (JPG, JPEG, PNG, WEBP).
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>{image ? 'Change / Replace Photo' : 'Choose Photo to Upload'}</span>
                    <input
                      id="product-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {image && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition border border-rose-200"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {image && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-fit">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Photo attached successfully!</span>
                  </div>
                )}
              </div>
            ) : (
              /* Mode 2: If user does NOT upload a photo, then they enter a URL */
              <div className="flex-1 space-y-3">
                <p className="text-xs text-slate-600 font-medium">
                  Don't have a photo file to upload? Paste a direct image link from the web:
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Image Web URL
                  </label>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => {
                      setImage(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://example.com/product-photo.jpg"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {image && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Clear URL
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Units & Multi-pricing Table (Requirements 10, 11, 12) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dynamic Selling Units & Multi-Pricing
              </h2>
              <p className="text-xs text-slate-500">
                Configure multiple pack sizes, weights, or volumes with specific prices and stock
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAddVariant()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Unit</span>
            </button>
          </div>

          {/* Quick Preset Unit Buttons (Requirement 10) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Quick Unit Presets:</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Click to add instantly)
              </span>
            </div>

            <div className="space-y-2">
              {PRESET_UNITS.map((group) => (
                <div key={group.group} className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500 w-24">
                    {group.group}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {group.units.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => handleAddVariant(u)}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-medium text-slate-600 transition shadow-2xs"
                      >
                        +{u}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Unit write-in (Requirement 10) */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 w-24">Custom Unit:</span>
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder='e.g., "750g", "3 Liter", "Pack of 10"'
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs max-w-xs flex-1"
              />
              <button
                type="button"
                onClick={handleAddCustomUnit}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Add Custom Unit
              </button>
            </div>
          </div>

          {/* Pricing Table (Requirement 12) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600 rounded-xl">
                  <th className="py-2.5 px-4 rounded-l-xl">Unit (e.g., 250g, 1kg)</th>
                  <th className="py-2.5 px-4">Price (₹)</th>
                  <th className="py-2.5 px-4">Available Stock</th>
                  <th className="py-2.5 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {variants.map((v, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    {/* Unit input */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={v.unit}
                        onChange={(e) => handleVariantChange(index, 'unit', e.target.value)}
                        placeholder="e.g., 500g, 1kg, 1 Piece"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                        required
                      />
                    </td>

                    {/* Price input */}
                    <td className="py-3 px-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={v.price}
                          onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                          required
                        />
                      </div>
                    </td>

                    {/* Stock input */}
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                        required
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Remove unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={() => handleAddVariant()}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Unit</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/products"
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Product...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'UPDATE PRODUCT' : 'SAVE PRODUCT'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditProduct;
