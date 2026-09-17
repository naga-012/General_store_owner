import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { orderAlarm } from '../utils/orderAlarm';
import api from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [latestOrder, setLatestOrder] = useState(null);
  const [activeAlertOrder, setActiveAlertOrder] = useState(null);
  const [productUpdateEvent, setProductUpdateEvent] = useState(null);

  // Stop order alarm sound
  const stopAlarm = () => {
    orderAlarm.stop();
    setActiveAlertOrder(null);
  };

  // Accept incoming order and silence alarm immediately
  const acceptOrderAndSilence = async (orderId) => {
    stopAlarm();
    try {
      const res = await api.put(`/orders/admin/${orderId}/status`, {
        status: 'ORDER_ACCEPTED',
      });
      if (res.data.success) {
        toast.success(`✓ Order #${res.data.order.orderId} Accepted! Alert silenced.`);
        setLatestOrder(res.data.order);
        return res.data.order;
      }
    } catch (err) {
      toast.error('Failed to accept order.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      stopAlarm();
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to Owner Socket:', newSocket.id);
      newSocket.emit('join_admin_room');
    });

    // When new order arrives, start loud repeating alarm!
    newSocket.on('new_order_received', (order) => {
      console.log('🚨 LOUD ALARM: New Order Received:', order);
      setLatestOrder(order);
      setActiveAlertOrder(order);
      orderAlarm.start();
      toast.info(`🔔 INCOMING ORDER: ${order.orderId} (₹${order.grandTotal}) - Accept to turn off sound!`, 10000);
    });

    newSocket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      // If the order that was alarming is accepted, stop alarm
      if (activeAlertOrder && activeAlertOrder._id === data.order?._id) {
        if (data.order.orderStatus !== 'ORDER_PLACED') {
          stopAlarm();
        }
      }
      setLatestOrder(data.order);
    });

    newSocket.on('low_stock_alert', (alert) => {
      toast.warning(`⚠️ Low stock: ${alert.productName} (${alert.unit}) has ${alert.remainingStock} left!`);
    });

    newSocket.on('product_updated', (change) => {
      setProductUpdateEvent(change);
    });

    setSocket(newSocket);

    return () => {
      stopAlarm();
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        latestOrder,
        activeAlertOrder,
        productUpdateEvent,
        stopAlarm,
        acceptOrderAndSilence,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
