import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  QrCode,
  UtensilsCrossed,
  FileText,
  ClipboardList,
  MessageSquare,
  Building,
  Settings,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';

interface NavLinkItem {
  to: string;
  label: string;
  icon: any;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const companyNavLinks: NavLinkItem[] = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/dashboard/whatsapp', label: 'WhatsApp Connect', icon: QrCode, badge: 'QR' },
    { to: '/dashboard/orders', label: 'Kitchen & Delivery', icon: ClipboardList },
    { to: '/dashboard/menu', label: 'Menu & Pricing', icon: UtensilsCrossed },
    { to: '/dashboard/knowledge', label: 'Knowledge Base', icon: FileText, badge: 'PDF/AI' },
    { to: '/dashboard/chats', label: 'Customer Chats', icon: MessageSquare },
  ];

  const superAdminNavLinks: NavLinkItem[] = [
    { to: '/superadmin', label: 'Companies Directory', icon: Building },
    { to: '/superadmin/stats', label: 'Platform Metrics', icon: LayoutDashboard },
  ];

  const links = isSuperAdmin ? superAdminNavLinks : companyNavLinks;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div>
        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isSuperAdmin ? 'Super Admin Portal' : 'Store Management'}
        </div>

        <nav className="mt-2 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard' || link.to === '/superadmin'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700 px-1.5 py-0.5 rounded">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {user?.company && !user.company.isActive && (
        <div className="bg-rose-950 border border-rose-800 rounded-lg p-3 text-rose-300 text-xs">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Account Suspended
          </div>
          Your WhatsApp bot and ordering features are currently deactivated. Contact platform owner.
        </div>
      )}

      <div className="border-t border-slate-800 pt-4 px-2 text-xs text-slate-500">
        <p className="font-medium text-slate-400">ChatPilot Multi-Tenant v1.0</p>
        <p className="mt-0.5">Modular AI • Baileys QR Sync</p>
      </div>
    </aside>
  );
};
