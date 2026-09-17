import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Tags,
  Boxes,
  ShoppingBag,
  Users,
  Bell,
  Store,
  User,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Add Product', path: '/products/add', icon: PlusCircle },
  { name: 'Categories', path: '/categories', icon: Tags },
  { name: 'Inventory', path: '/inventory', icon: Boxes },
  { name: 'Orders', path: '/orders', icon: ShoppingBag },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Store Settings', path: '/settings', icon: Store },
  { name: 'Owner Profile', path: '/profile', icon: User },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, owner } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
                🏪
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-wide text-white">
                  Shop Owner
                </h1>
                <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                  Admin Portal
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between gap-3 mb-3 px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-700 text-emerald-100 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {owner?.name ? owner.name.charAt(0).toUpperCase() : 'O'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">
                  {owner?.name || 'Store Owner'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {owner?.email || 'admin@kirana.com'}
                </div>
              </div>
            </div>

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
              title="Open Customer Store"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
