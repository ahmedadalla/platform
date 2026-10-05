import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LogOut, User as UserIcon, Building2, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            💬
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">ChatPilot B2B</h1>
            <p className="text-xs text-slate-500 font-medium">WhatsApp AI Order Platform</p>
          </div>
        </div>

        {user?.company && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200 ml-3">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">{user.company.name}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${user.company.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {user.company.isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Realtime Live Socket Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="text-emerald-700 font-medium">Live Sync Active</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Reconnecting...</span>
            </>
          )}
        </div>

        {/* User Profile & Role */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800 flex items-center justify-end gap-1.5">
              {user?.role === 'SUPER_ADMIN' && <ShieldCheck className="w-4 h-4 text-purple-600" />}
              {user?.name}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              {user?.role === 'SUPER_ADMIN' ? 'Platform Super Admin' : 'Company Admin'}
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm">
            {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
