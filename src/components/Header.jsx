import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Plus,
  ExternalLink,
  Store,
  CheckCircle2,
  AlertTriangle,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { orderAlarm } from '../utils/orderAlarm';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const Header = ({ onOpenSidebar }) => {
  const { owner } = useAuth();
  const { latestOrder } = useSocket();
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchStoreInfo = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchStoreInfo();
    fetchNotificationCount();
  }, [latestOrder]);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm">
      {/* Left: Mobile trigger & Store Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-8 h-8 object-contain rounded-lg border border-slate-200 hidden sm:block bg-white p-0.5"
          />
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">
              {settings?.shopName || 'Manikanta Superstore'}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  settings?.isOpen !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{settings?.isOpen !== false ? 'Store is Open' : 'Store is Closed'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Quick actions, notifications, profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Quick Add Product */}
        <Link
          to="/products/add"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/30 transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </Link>

        {/* Customer Store Link */}
        <a
          href={
            import.meta.env.VITE_CUSTOMER_URL ||
            (typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
              ? 'http://localhost:5173'
              : 'https://kirana-customer-web.onrender.com')
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-600 text-xs font-medium transition bg-slate-50 hover:bg-emerald-50/50"
        >
          <span className="hidden md:inline">View Customer Site</span>
          <span className="md:hidden">Customer Site</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Test Loud Alarm Button */}
        <button
          type="button"
          onClick={() => {
            orderAlarm.testSound();
            toast.info('🔔 Loud order alarm test sound playing!');
          }}
          title="Test Loud Order Alarm"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-xs"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span className="hidden sm:inline">Test Alarm</span>
        </button>

        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Owner Profile Icon */}
        <Link
          to="/profile"
          className="flex items-center gap-2 pl-2 sm:border-l sm:border-slate-200"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs border border-emerald-300 shadow-sm">
            {owner?.name ? owner.name.charAt(0).toUpperCase() : 'O'}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
