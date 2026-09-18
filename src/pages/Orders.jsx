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
  MapPin,
  ExternalLink,
  Navigation,
  Copy,
  MessageSquare,
  Compass,
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

export const getLocationMeta = (order) => {
  if (!order) {
    return {
      isPickup: true,
      displayAddress: 'Store Counter Pickup',
      fullAddress: 'Store Counter Pickup',
      landmark: '',
      city: '',
      pincode: '',
      hasCoords: false,
      lat: null,
      lng: null,
      mapsUrl: '',
      directionsUrl: '',
    };
  }

  const cust = order.customer || {};

  // Extract lat / lng from all potential locations
  let lat =
    order.latitude ??
    order.lat ??
    order.coordinates?.lat ??
    order.coordinates?.latitude ??
    cust.latitude ??
    cust.lat ??
    cust.coordinates?.lat ??
    cust.location?.lat ??
    cust.location?.latitude ??
    null;

  let lng =
    order.longitude ??
    order.lng ??
    order.coordinates?.lng ??
    order.coordinates?.longitude ??
    cust.longitude ??
    cust.lng ??
    cust.coordinates?.lng ??
    cust.location?.lng ??
    cust.location?.longitude ??
    null;

  if (Array.isArray(order.coordinates) && order.coordinates.length >= 2) {
    lng = order.coordinates[0];
    lat = order.coordinates[1];
  } else if (Array.isArray(cust.coordinates) && cust.coordinates.length >= 2) {
    lng = cust.coordinates[0];
    lat = cust.coordinates[1];
  }

  if (lat !== null) lat = Number(lat);
  if (lng !== null) lng = Number(lng);
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  // Address strings
  const rawAddr =
    order.customerAddress ||
    order.deliveryAddress ||
    order.address ||
    cust.address ||
    cust.formattedAddress ||
    order.shippingAddress ||
    '';

  const addressStr = typeof rawAddr === 'string' ? rawAddr.trim() : (rawAddr?.address || rawAddr?.formattedAddress || '');
  const landmark = order.landmark || cust.landmark || (typeof rawAddr === 'object' ? rawAddr.landmark : '') || '';
  const pincode = order.pincode || cust.pincode || (typeof rawAddr === 'object' ? rawAddr.pincode : '') || '';
  const city = order.city || cust.city || (typeof rawAddr === 'object' ? rawAddr.city : '') || '';
  const houseNo = order.houseNo || cust.houseNo || (typeof rawAddr === 'object' ? rawAddr.houseNo : '') || '';

  const isPickup =
    order.orderType === 'PICKUP' ||
    (!addressStr && !hasCoords && order.orderType !== 'DELIVERY');

  let fullAddress = addressStr;
  if (!fullAddress && !isPickup && hasCoords) {
    fullAddress = `GPS Pin Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  } else if (!fullAddress && isPickup) {
    fullAddress = 'Store Counter Pickup';
  }

  // Google Maps URLs
  let mapsUrl = order.googleMapsUrl || cust.googleMapsUrl || cust.mapsUrl || '';
  let directionsUrl = '';

  if (hasCoords) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else if (fullAddress && !isPickup) {
    const query = encodeURIComponent(fullAddress + (city ? ', ' + city : '') + (pincode ? ' ' + pincode : ''));
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  }

  return {
    isPickup,
    displayAddress: fullAddress,
    fullAddress,
    landmark,
    city,
    pincode,
    houseNo,
    hasCoords,
    lat,
    lng,
    mapsUrl,
    directionsUrl,
  };
};

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

  const handleCopyLocation = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      toast.success('✓ Location copied to clipboard');
    } catch {
      toast.error('Failed to copy location');
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${activeTab === tab.id
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
            const loc = getLocationMeta(order);
            const custName = order.customerName || order.customer?.name || 'Customer';
            const custMobile = order.customerMobile || order.customer?.mobile || '';

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
                        <span className="font-medium text-slate-700">{custName}</span>
                        {custMobile && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3" />
                            {custMobile}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                    <span className="text-xs text-slate-400 font-medium">Grand Total</span>
                    <span className="text-lg font-black text-slate-900">₹{order.grandTotal}</span>
                  </div>
                </div>

                {/* Customer Exact Location Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-900">
                        {loc.isPickup ? 'Store Counter Pickup' : 'Customer Delivery Location'}
                      </span>
                      {loc.hasCoords && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          📍 GPS Pin Attached
                        </span>
                      )}
                    </div>

                    {!loc.isPickup && loc.mapsUrl && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLocation(`${loc.fullAddress}${loc.hasCoords ? ` (GPS: ${loc.lat}, ${loc.lng})` : ''}`)}
                          className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
                          title="Copy address to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <a
                          href={loc.directionsUrl || loc.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-800 text-[11px] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                          title="Get turn-by-turn directions"
                        >
                          <Navigation className="w-3 h-3 text-blue-600" />
                          <span>Navigate</span>
                        </a>
                        <a
                          href={loc.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Maps</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="text-slate-700 pl-8 leading-relaxed">
                    <p className="font-semibold text-slate-900">{loc.displayAddress}</p>
                    {loc.landmark && (
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        <strong>Landmark:</strong> {loc.landmark}
                      </p>
                    )}
                    {loc.hasCoords && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Coordinates: {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                      </p>
                    )}
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
                          <strong>{item.productName || item.name}</strong> — {item.unit} × {item.quantity}
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
                    <span>View Full Details & Exact Location</span>
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
      {selectedOrder && (() => {
        const modalLoc = getLocationMeta(selectedOrder);
        const mCustName = selectedOrder.customerName || selectedOrder.customer?.name || 'Customer';
        const mCustMobile = selectedOrder.customerMobile || selectedOrder.customer?.mobile || '';
        const mCustEmail = selectedOrder.customerEmail || selectedOrder.customer?.email || '';
        const cleanMobile = (mCustMobile || '').replace(/[^0-9]/g, '');
        const waNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
        const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${mCustName}, regarding your order #${selectedOrder.orderId} from Manikanta Supermarket:`)}` : '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedOrder.orderId}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {selectedOrder.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer Exact Location & Details */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/90 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">Customer & Delivery Location</span>
                      <span className="text-[10px] text-slate-500">
                        {modalLoc.isPickup ? 'Customer will pick up from store counter' : 'Exact destination address and GPS pin'}
                      </span>
                    </div>
                  </div>

                  {modalLoc.hasCoords && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-emerald-700" />
                      Live GPS Verified
                    </span>
                  )}
                </div>

                {/* Customer Contact row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Name</span>
                    <span className="font-bold text-slate-900 text-xs">{mCustName}</span>
                    {mCustEmail && (
                      <span className="text-[11px] text-slate-500 block truncate">{mCustEmail}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact & WhatsApp</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {mCustMobile ? (
                        <>
                          <a
                            href={`tel:${mCustMobile}`}
                            className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs"
                          >
                            <Phone className="w-3 h-3" />
                            {mCustMobile}
                          </a>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg border border-emerald-300 text-xs transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Address View */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">
                      Exact Delivery Address
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyLocation(`${modalLoc.fullAddress}${modalLoc.hasCoords ? ` (GPS: ${modalLoc.lat}, ${modalLoc.lng})` : ''}`)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200 hover:bg-slate-50"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy Address</span>
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                    <p className="font-bold text-slate-900 text-xs leading-relaxed">
                      {modalLoc.displayAddress}
                    </p>
                    {modalLoc.landmark && (
                      <p className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium inline-block mt-1">
                        <strong>Landmark:</strong> {modalLoc.landmark}
                      </p>
                    )}
                    {(modalLoc.city || modalLoc.pincode) && (
                      <p className="text-[11px] text-slate-500">
                        {[modalLoc.city, modalLoc.pincode].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* GPS Coordinates & Interactive Map */}
                {modalLoc.hasCoords && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">
                        Exact GPS Location
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {modalLoc.lat.toFixed(6)}, {modalLoc.lng.toFixed(6)}
                      </span>
                    </div>

                    {/* Embedded OpenStreetMap Preview */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm bg-slate-100">
                      <iframe
                        title="Customer Location Pin"
                        width="100%"
                        height="180"
                        className="w-full h-44 border-0"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${modalLoc.lng - 0.005}%2C${modalLoc.lat - 0.003}%2C${modalLoc.lng + 0.005}%2C${modalLoc.lat + 0.003}&layer=mapnik&marker=${modalLoc.lat}%2C${modalLoc.lng}`}
                      />
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold">
                          📍 Pin at Customer Spot
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Map Action Buttons */}
                {!modalLoc.isPickup && modalLoc.mapsUrl && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={modalLoc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Google Maps</span>
                    </a>
                    <a
                      href={modalLoc.directionsUrl || modalLoc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 transition"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Get Directions</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ordered Items</div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{it.productName || it.name}</div>
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
        );
      })()}

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
