import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  CookingPot,
  Bike,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  User,
  PlusCircle,
  MessageSquare,
  CheckCheck,
  X as XIcon,
  Zap,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string | null;
  notes?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'PENDING' | 'IN_KITCHEN' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  items: OrderItem[];
  createdAt: string;
}

export const LiveOrders: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [simulating, setSimulating] = useState(false);
  // Toast notification state for WhatsApp auto-send confirmations
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (socket) {
      // Listen for newly created orders in real-time
      socket.on('order:created', (newOrder: Order) => {
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      });

      // Listen for status changes in real-time
      socket.on('order:status_changed', (updated: Order) => {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      });
    }

    return () => {
      if (socket) {
        socket.off('order:created');
        socket.off('order:status_changed');
      }
    };
  }, [socket]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, {
        status,
        notifyCustomer,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? res.data.order : o))
      );

      // Show appropriate toast feedback
      if (status === 'OUT_FOR_DELIVERY') {
        // Always auto-notifies the customer
        if (res.data.whatsappNotified) {
          showToast(`🛵 تم إرسال إشعار "طلبك في الطريق" على واتساب للعميل تلقائياً! ✅`, 'success');
        } else {
          showToast(`🛵 Order moved to Delivery. WhatsApp not connected — customer not notified.`, 'info');
        }
      } else if (status === 'DELIVERED' && res.data.whatsappNotified) {
        showToast(`✅ تم إبلاغ العميل بتسليم الطلب على واتساب!`, 'success');
      } else if (status === 'IN_KITCHEN' && res.data.whatsappNotified) {
        showToast(`🍳 Customer notified: Order in kitchen!`, 'success');
      }
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  const handleSimulateOrder = async () => {
    setSimulating(true);
    try {
      await api.post('/orders/simulate', {
        customerName: 'Alex Rivera',
        customerPhone: '+1 (555) 782-9011',
        deliveryAddress: '550 Battery St, 14th Floor',
        notes: 'Doorbell code is #401',
      });
      fetchOrders();
    } catch (err) {
      alert('Failed to simulate order');
    } finally {
      setSimulating(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const kitchenOrders = orders.filter((o) => o.status === 'IN_KITCHEN');
  const deliveryOrders = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const renderOrderCard = (order: Order) => {
    const timeFormatted = new Date(order.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        key={order.id}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900 font-mono">
              #{order.orderNumber}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeFormatted}
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{order.customerName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{order.customerPhone}</span>
          </div>
          {order.deliveryAddress && (
            <div className="flex items-start gap-1.5 text-slate-600 text-[11px] mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-slate-50 rounded-lg p-2.5 text-xs space-y-1 border border-slate-100">
          {order.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-700">
              <span>
                <strong className="text-emerald-700">{it.quantity}x</strong> {it.name}
              </span>
              <span className="font-mono text-[11px]">
                {user?.company?.currency || '$'}
                {(it.price * it.quantity).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="border-t border-slate-200 pt-1.5 mt-1 text-[11px] flex justify-between text-slate-500">
            <span>Delivery Fee:</span>
            <span>
              {user?.company?.currency || '$'}
              {order.deliveryFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-xs text-slate-900 pt-0.5">
            <span>Total:</span>
            <span className="text-emerald-700">
              {user?.company?.currency || '$'}
              {order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {order.notes && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 font-medium">
            📝 "{order.notes}"
          </div>
        )}

        {/* Action Progression Buttons */}
        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
          {order.status === 'PENDING' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'IN_KITCHEN')}
              className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1"
            >
              <CookingPot className="w-3.5 h-3.5" />
              <span>Send to Kitchen</span>
            </button>
          )}

          {order.status === 'IN_KITCHEN' && (
            <div className="flex-1 flex flex-col gap-1">
              <button
                onClick={() => updateOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Send to Delivery</span>
              </button>
              <div className="flex items-center gap-1 justify-center text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                <Zap className="w-2.5 h-2.5 text-purple-600" />
                <span>Auto-notifies customer on WhatsApp 📱</span>
              </div>
            </div>
          )}

          {order.status === 'OUT_FOR_DELIVERY' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark Delivered</span>
            </button>
          )}

          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Cancel Order"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* WhatsApp Auto-Notification Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-5 py-3.5 rounded-xl shadow-lg border max-w-md w-full text-sm font-semibold transition-all
          ${toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="flex-1">{toast.message}</div>
          <button onClick={() => setToast(null)} className="mt-0.5 text-slate-400 hover:text-slate-600">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Kitchen & Delivery Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time order pipeline. Advancing order status automatically synchronizes across all kitchen staff screens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-2xs cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notify Customer on WhatsApp</span>
          </label>

          <button
            onClick={handleSimulateOrder}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate Incoming Order</span>
          </button>
        </div>
      </div>

      {/* Real-time Order Columns (Kanban) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {/* Column 1: Pending */}
        <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                1. Pending Review
              </h3>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No pending orders</div>
            ) : (
              pendingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 2: In Kitchen */}
        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/60 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <CookingPot className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900">
                2. In Kitchen
              </h3>
            </div>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {kitchenOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {kitchenOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">Kitchen is clear</div>
            ) : (
              kitchenOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 3: Out for Delivery */}
        <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-200/60 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-purple-900">
                3. In Delivery
              </h3>
            </div>
            <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
              {deliveryOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {deliveryOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No couriers on road</div>
            ) : (
              deliveryOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 4: Delivered */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/60 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                4. Delivered
              </h3>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {deliveredOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No delivered orders yet</div>
            ) : (
              deliveredOrders.slice(0, 10).map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
