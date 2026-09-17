import React, { useState } from 'react';
import { User, Lock, Phone, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Profile = () => {
  const { owner, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(owner?.name || '');
  const [mobile, setMobile] = useState(owner?.mobile || '');
  const [address, setAddress] = useState(owner?.address || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password && password.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name, mobile, address };
      if (password) payload.password = password;

      await updateProfile(payload);
      toast.success('Owner profile updated successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Owner Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal credentials and shop admin security
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        {/* Role & Email Summary Badge */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black flex items-center justify-center text-base">
              {owner?.name ? owner.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">{owner?.name}</div>
              <div className="text-xs text-slate-500">{owner?.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm">
            <Shield className="w-3.5 h-3.5" />
            <span>Role: {owner?.role?.toUpperCase() || 'ADMIN'}</span>
          </div>
        </div>

        {/* Name & Mobile */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Owner Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Registered Mobile Number
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Account Email (Read-Only)
            </label>
            <input
              type="email"
              value={owner?.email || ''}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Store / Owner Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white"
            />
          </div>
        </div>

        {/* Change Password */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Change Admin Password (Optional)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Update Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
