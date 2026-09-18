import React from 'react';
import { BellRing, CheckCircle, VolumeX, ShoppingBag } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const IncomingOrderAlert = () => {
  const { activeAlertOrder, stopAlarm, acceptOrderAndSilence } = useSocket();
  const navigate = useNavigate();

  if (!activeAlertOrder) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white shadow-2xl py-3 px-4 sm:px-8 animate-pulse-subtle border-b-2 border-white/20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Icon & Details */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce flex-shrink-0">
            <BellRing className="w-5 h-5 text-yellow-200" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-black text-sm uppercase tracking-wider bg-white text-rose-700 px-2 py-0.5 rounded-md text-[10px]">
                🚨 NEW INCOMING ORDER
              </span>
              <strong className="text-base text-white">{activeAlertOrder.orderId}</strong>
            </div>
            <p className="text-xs text-rose-100 font-medium mt-0.5 flex flex-wrap items-center gap-2">
              <span>Customer: <strong className="text-white">{activeAlertOrder.customerName || activeAlertOrder.customer?.name || 'Customer'}</strong></span>
              <span>•</span>
              <span>Total: <strong className="text-yellow-200">₹{activeAlertOrder.grandTotal}</strong></span>
              {(activeAlertOrder.customerAddress || activeAlertOrder.deliveryAddress || activeAlertOrder.customer?.address) && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded text-[10px] text-yellow-100 max-w-[200px] truncate">
                    📍 {activeAlertOrder.customerAddress || activeAlertOrder.deliveryAddress || activeAlertOrder.customer?.address}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Silence Mute button */}
          <button
            onClick={stopAlarm}
            className="px-3 py-2 rounded-xl bg-black/30 hover:bg-black/40 text-rose-100 hover:text-white font-bold text-xs flex items-center gap-1.5 transition border border-white/10"
            title="Silence the alarm chime"
          >
            <VolumeX className="w-4 h-4" />
            <span>Mute Sound</span>
          </button>

          {/* Accept Order Button */}
          <button
            onClick={async () => {
              await acceptOrderAndSilence(activeAlertOrder._id);
              navigate('/orders');
            }}
            className="px-5 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 font-black text-xs shadow-lg flex items-center gap-1.5 transition transform hover:scale-105"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>ACCEPT ORDER (OFF SOUND)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingOrderAlert;
