import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, RefreshCw, AlertTriangle, ShoppingBag, Info } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const Notifications = () => {
  const { latestOrder } = useSocket();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [latestOrder]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read.');
    } catch (e) {
      toast.error('Failed to mark notifications read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time shop alerts, incoming customer orders & inventory notices
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-slate-500">Loading alerts...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-6">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No notifications</h3>
          <p className="text-xs text-slate-500 mt-1">
            You're all caught up! New order alerts and stock warnings will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            let Icon = Info;
            let iconBg = 'bg-blue-50 text-blue-600';
            if (n.type === 'LOW_STOCK') {
              Icon = AlertTriangle;
              iconBg = 'bg-amber-50 text-amber-600';
            } else if (n.type?.startsWith('ORDER')) {
              Icon = ShoppingBag;
              iconBg = 'bg-emerald-50 text-emerald-600';
            }

            return (
              <div
                key={n._id}
                onClick={() => !n.read && handleMarkAsRead(n._id)}
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 cursor-pointer ${
                  n.read
                    ? 'bg-white border-slate-200/80 opacity-75'
                    : 'bg-emerald-50/40 border-emerald-300 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 inline-block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n._id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-100 transition flex-shrink-0"
                    title="Mark read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
