import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle,
  Clock,
  Package,
  Check,
  X,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'new', label: 'New Orders' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'packed', label: 'Packed / Ready' },
  { id: 'completed', label: 'Completed (Last 7 Days)' },
  { id: 'rejected', label: 'Rejected' },
];

const Orders = () => {
  const { latestOrder, stopAlarm } = useSocket();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  // Active modal for detailed order view
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Reject modal
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Status updating state
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/admin/all?status=${activeTab}&search=${search}`);
      if (res.data.success) {
        setOrders(res.data.orders);
        // If an order is currently selected in modal, update it too
        if (selectedOrder) {
          const updated = res.data.orders.find((o) => o._id === selectedOrder._id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, latestOrder]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  // Change Order Status (Requirement 28 & 29)
  const handleUpdateStatus = async (orderId, newStatus, reason = '') => {
    setUpdatingId(orderId);
    if (newStatus === 'ORDER_ACCEPTED') {
      stopAlarm();
    }
    try {
      const res = await api.put(`/orders/admin/${orderId}/status`, {
        status: newStatus,
        rejectionReason: reason,
      });

      if (res.data.success) {
        stopAlarm();
        toast.success(`✓ Order updated to ${newStatus.replace(/_/g, ' ')}. Sound alarm stopped.`);
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.data.order : o))
        );
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(res.data.order);
        }
        if (rejectingOrder) {
          setRejectingOrder(null);
          setRejectionReason('');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Customer Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Accept, pack, and mark store pickup orders in real time
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID (e.g. ORD-...), customer name or phone number..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900"
          >
            Search
          </button>
        </form>
      </div>

      {/* 7-Day Completed Orders Banner */}
      {activeTab === 'completed' && (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
          <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>7-Day Retention:</strong> Completed orders are kept in your live history for 7 days from completion.
          </span>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-slate-500">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-6">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are no orders matching the selected tab or search query.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            if (order.orderStatus === 'ORDER_PLACED') statusBadge = 'bg-amber-100 text-amber-900 border-amber-300';
            else if (order.orderStatus === 'ORDER_ACCEPTED') statusBadge = 'bg-blue-100 text-blue-900 border-blue-300';
            else if (order.orderStatus === 'PACKED' || order.orderStatus === 'READY_FOR_PICKUP') statusBadge = 'bg-purple-100 text-purple-900 border-purple-300';
            else if (order.orderStatus === 'COMPLETED') statusBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
            else if (order.orderStatus === 'REJECTED') statusBadge = 'bg-rose-100 text-rose-900 border-rose-300';

            const isUpdating = updatingId === order._id;

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover-lift space-y-4"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900">
                          {order.orderId}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge}`}>
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                        {order.orderStatus === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Clock className="w-2.5 h-2.5" /> 7-Day History
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{order.customerName || 'Customer'}</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3" />
                          {order.customerMobile}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                    <span className="text-xs text-slate-400 font-medium">Grand Total</span>
                    <span className="text-lg font-black text-slate-900">₹{order.grandTotal}</span>
                  </div>
                </div>

                {/* Items Summary (Requirement 27) */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Items ({order.items?.length || 0}):
                  </div>
                  <div className="space-y-1.5">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                        <span className="font-medium">
                          <strong>{item.name}</strong> — {item.unit} × {item.quantity}
                        </span>
                        <span className="font-bold text-slate-800">₹{item.lineTotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Action Buttons (Requirement 28) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition py-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Full Details</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Flow Actions */}
                    {order.orderStatus === 'ORDER_PLACED' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'ORDER_ACCEPTED')}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Order</span>
                        </button>
                        <button
                          onClick={() => setRejectingOrder(order)}
                          disabled={isUpdating}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {order.orderStatus === 'ORDER_ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'PACKED')}
                        disabled={isUpdating}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-600/30 transition flex items-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Pack & Ready For Pickup</span>
                      </button>
                    )}

                    {(order.orderStatus === 'PACKED' || order.orderStatus === 'READY_FOR_PICKUP') && (
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'COMPLETED')}
                        disabled={isUpdating}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Picked Up & Completed</span>
                      </button>
                    )}

                    {order.orderStatus === 'COMPLETED' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                        <span>Order Completed</span>
                      </span>
                    )}

                    {order.orderStatus === 'REJECTED' && (
                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                        <X className="w-4 h-4" />
                        <span>Order Rejected</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedOrder.orderId}</h3>
                <span className="text-xs text-slate-500">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800">Customer Contact & Address</div>
              <div>Name: <strong className="text-slate-700">{selectedOrder.customerName}</strong></div>
              <div>Mobile: <strong className="text-slate-700">{selectedOrder.customerMobile}</strong></div>
              <div>Address: <span className="text-slate-600">{selectedOrder.deliveryAddress || 'Store Pickup'}</span></div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ordered Items</div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{it.name}</div>
                      <div className="text-slate-500">{it.unit} × {it.quantity} @ ₹{it.price} each</div>
                    </div>
                    <div className="font-black text-slate-900">₹{it.lineTotal}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total breakdown */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-sm">
              <span className="font-bold text-emerald-950">Grand Total Amount</span>
              <span className="text-xl font-black text-emerald-800">₹{selectedOrder.grandTotal}</span>
            </div>

            {/* Status Flow Timeline */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status History</div>
              <div className="space-y-1.5 text-xs text-slate-600">
                {selectedOrder.statusHistory?.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div>
                      <strong className="text-slate-800">{h.status.replace(/_/g, ' ')}</strong> — {h.note}
                      <div className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reject Order Reason Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Order {rejectingOrder.orderId}</h3>
            <p className="text-xs text-slate-500">
              Please state why this order cannot be accepted (e.g. item temporarily out of stock).
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setRejectingOrder(null);
                  setRejectionReason('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectingOrder._id, 'REJECTED', rejectionReason)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
