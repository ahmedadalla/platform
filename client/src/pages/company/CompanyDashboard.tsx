import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingBag,
  CookingPot,
  Bike,
  CheckCircle,
  QrCode,
  UtensilsCrossed,
  FileText,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

export const CompanyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [waStatus, setWaStatus] = useState<string>('DISCONNECTED');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, waRes] = await Promise.all([
          api.get('/orders'),
          api.get('/whatsapp/status'),
        ]);
        setOrders(ordersRes.data);
        setWaStatus(waRes.data.status);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const kitchen = orders.filter((o) => o.status === 'IN_KITCHEN').length;
  const delivery = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const totalSales = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Store Overview for <strong>{user?.company?.name}</strong> • AI WhatsApp Bot & Order Pipeline.
          </p>
        </div>

        <Link
          to="/dashboard/orders"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors self-start"
        >
          <span>Open Kitchen Board</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* WhatsApp Connectivity Banner */}
      {waStatus !== 'CONNECTED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">WhatsApp Not Paired Yet</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Scan your QR code to activate automated AI ordering on your business number.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/whatsapp"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
          >
            Pair WhatsApp QR Now
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{pending}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting kitchen review</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Kitchen</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <CookingPot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{kitchen}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently cooking</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Delivery</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{delivery}</div>
          <div className="text-[11px] text-slate-400 mt-1">Out with couriers</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{delivered}</div>
          <div className="text-[11px] text-slate-400 mt-1">Completed orders</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {user?.company?.currency || '$'}{totalSales.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total order volume</div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/dashboard/whatsapp"
          className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">WhatsApp QR Pairing</h3>
          <p className="text-xs text-slate-500 mt-1">
            Generate and scan QR code to link your business number and test bot chat.
          </p>
        </Link>

        <Link
          to="/dashboard/menu"
          className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Menu & Delivery Pricing</h3>
          <p className="text-xs text-slate-500 mt-1">
            Update dish prices, categories, stock availability, and delivery charges.
          </p>
        </Link>

        <Link
          to="/dashboard/knowledge"
          className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Knowledge Base (PDFs/Images)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload PDFs, restaurant rules, or food allergen info for the AI to learn.
          </p>
        </Link>
      </div>

      {/* Recent Orders Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Recent Orders</h3>
          <Link
            to="/dashboard/orders"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View Live Kanban Board →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No orders yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-slate-900 text-sm">#{o.orderNumber}</span>
                  <div>
                    <span className="font-semibold text-slate-800">{o.customerName}</span>
                    <div className="text-slate-400 text-[11px]">{o.items?.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900 font-mono">
                    {user?.company?.currency || '$'}{o.total.toFixed(2)}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
