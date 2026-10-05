import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Bot, Shield, Building2, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);

      if (res.data.user.role === 'SUPER_ADMIN') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white text-center">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-xs rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">ChatPilot B2B Platform</h2>
          <p className="text-emerald-100 text-sm mt-1">AI WhatsApp Ordering & Customer Support</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Logins */}
          <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              ⚡ Quick Demo Logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@platform.com', 'admin123')}
                className="flex items-center gap-2 p-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:border-purple-500 hover:text-purple-700 transition-colors shadow-2xs text-left"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <div>
                  <div className="text-slate-800">Super Admin</div>
                  <div className="text-[10px] text-slate-400 font-normal">Platform Owner</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('owner@bellaroma.com', 'owner123')}
                className="flex items-center gap-2 p-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:text-emerald-700 transition-colors shadow-2xs text-left"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-slate-800">Bella Roma</div>
                  <div className="text-[10px] text-slate-400 font-normal">Company Owner</div>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@business.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Want to register a new company?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
