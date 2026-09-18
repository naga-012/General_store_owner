import React, { useState, useEffect } from 'react';
import { Store, Save, Clock, MapPin, Phone, Mail, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const StoreSettings = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    shopName: '',
    tagline: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    openingTime: '07:00 AM',
    closingTime: '10:00 PM',
    isOpen: true,
    pickupInstructions: '',
    minOrderAmount: 0,
  });

  useEffect(() => {
    api.get('/admin/settings')
      .then((res) => {
        if (res.data.success && res.data.settings) {
          setFormData({
            shopName: res.data.settings.shopName || '',
            tagline: res.data.settings.tagline || '',
            phone: res.data.settings.phone || '',
            whatsapp: res.data.settings.whatsapp || '',
            email: res.data.settings.email || '',
            address: res.data.settings.address || '',
            openingTime: res.data.settings.openingTime || '07:00 AM',
            closingTime: res.data.settings.closingTime || '10:00 PM',
            isOpen: res.data.settings.isOpen !== false,
            pickupInstructions: res.data.settings.pickupInstructions || '',
            minOrderAmount: res.data.settings.minOrderAmount || 0,
          });
        }
      })
      .catch(() => {
        toast.error('Failed to load store settings');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/settings', formData);
      if (res.data.success) {
        toast.success('Store settings updated successfully.');
      }
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-medium text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Store Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure shop name, customer pickup instructions, and operating hours
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        {/* Store Active Status Switch */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm text-slate-800">Store Open / Closed Status</div>
            <div className="text-xs text-slate-500">
              When toggled off, customers are informed that the shop is temporarily closed for orders.
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isOpen"
              checked={formData.isOpen}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Basic Store Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Brand & Contact Details
            </h2>
          </div>

          {/* Store Logo Display */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
              <img src="/logo.png" alt="Manikanta Superstore Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Store Logo</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Brand emblem used across customer web app, owner portal, and invoice receipts.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store / Supermarket Name</label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                placeholder="e.g. Manikanta Superstore"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="Your trusted neighborhood grocery store"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 95730 45430"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="+91 95730 45430"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@manikantasupermarket.com"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Store Address</label>
            <textarea
              rows={2}
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Shop No. 4, Main Road, Telangana..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Operating Hours & Pickup */}
        <div className="space-y-4 pt-3 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Hours & Store Pickup
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Opening Time</label>
              <input
                type="text"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleChange}
                placeholder="07:00 AM"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Closing Time</label>
              <input
                type="text"
                name="closingTime"
                value={formData.closingTime}
                onChange={handleChange}
                placeholder="10:00 PM"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Pickup Instructions</label>
            <textarea
              rows={2}
              name="pickupInstructions"
              value={formData.pickupInstructions}
              onChange={handleChange}
              placeholder="Show your Order ID at the Express Checkout counter..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Store Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreSettings;
