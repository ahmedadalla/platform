import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  Building2,
  Users,
  ShoppingBag,
  DollarSign,
  Cpu,
  Power,
  PowerOff,
  Settings2,
  Plus,
  Search,
  Check,
  X,
  AlertTriangle,
  Key,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

interface Company {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  isActive: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  currency: string;
  aiProvider: string;
  aiModel: string;
  aiApiKey?: string | null;
  rawHasApiKey: boolean;
  aiCustomBaseUrl?: string | null;
  aiSystemPrompt?: string | null;
  createdAt: string;
  users: { id: string; name: string; email: string }[];
  _count: { orders: number; items: number; documents: number };
}

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalOrders: number;
  totalRevenue: number;
}

export const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // AI Configuration Modal state
  const [editingAICompany, setEditingAICompany] = useState<Company | null>(null);
  const [aiForm, setAiForm] = useState({
    aiProvider: 'gemini',
    aiModel: 'gemini-3.1-flash-lite',
    aiApiKey: '',
    aiCustomBaseUrl: '',
    aiSystemPrompt: '',
  });

  // Create Company Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: 'password123',
    deliveryFee: '3.50',
    aiProvider: 'gemini',
    aiModel: 'gemini-3.1-flash-lite',
    aiApiKey: '',
  });

  const fetchData = async () => {
    try {
      const [statsRes, companiesRes] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/companies'),
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      console.error('Failed to fetch superadmin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCompanyStatus = async (company: Company) => {
    const nextStatus = !company.isActive;
    try {
      await api.patch(`/superadmin/companies/${company.id}/status`, {
        isActive: nextStatus,
      });
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, isActive: nextStatus } : c))
      );
      if (stats) {
        setStats({
          ...stats,
          activeCompanies: stats.activeCompanies + (nextStatus ? 1 : -1),
          suspendedCompanies: stats.suspendedCompanies + (nextStatus ? -1 : 1),
        });
      }
    } catch (err) {
      alert('Failed to update company status');
    }
  };

  const openAIModal = (c: Company) => {
    setEditingAICompany(c);
    setAiForm({
      aiProvider: c.aiProvider || 'gemini',
      aiModel: c.aiModel || 'gemini-1.5-flash',
      aiApiKey: '',
      aiCustomBaseUrl: c.aiCustomBaseUrl || '',
      aiSystemPrompt: c.aiSystemPrompt || '',
    });
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAICompany) return;

    try {
      const payload: any = {
        aiProvider: aiForm.aiProvider,
        aiModel: aiForm.aiModel,
        aiCustomBaseUrl: aiForm.aiCustomBaseUrl,
        aiSystemPrompt: aiForm.aiSystemPrompt,
      };
      if (aiForm.aiApiKey) {
        payload.aiApiKey = aiForm.aiApiKey;
      }

      await api.patch(`/superadmin/companies/${editingAICompany.id}/ai`, payload);
      alert('AI Configuration updated successfully!');
      setEditingAICompany(null);
      fetchData();
    } catch (err) {
      alert('Failed to save AI configuration');
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/companies', createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        phone: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: 'password123',
        deliveryFee: '3.50',
        aiProvider: 'gemini',
        aiModel: 'gemini-1.5-flash',
        aiApiKey: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create company');
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      c.users[0]?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Super Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage subscribed companies, toggle operational status, and configure modular AI models.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Company
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscribed Companies</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalCompanies ?? '-'}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
            <span className="font-semibold text-emerald-600">{stats?.activeCompanies ?? 0} active</span>
            <span>•</span>
            <span className="font-semibold text-rose-500">{stats?.suspendedCompanies ?? 0} suspended</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalOrders ?? '-'}</div>
          <div className="text-xs text-slate-500 mt-2">Processed across all tenant bots</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform GMV</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            ${stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-slate-500 mt-2">Gross customer order volume</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Engines Supported</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">3</div>
          <div className="text-xs text-slate-500 mt-2">Gemini • OpenAI • OpenRouter</div>
        </div>
      </div>

      {/* Companies Management Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-slate-900">Registered Companies</h2>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {companies.length}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search companies or owners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Company / Owner</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Provider & Model</th>
                <th className="py-3 px-4">Menu / Orders</th>
                <th className="py-3 px-4">Delivery Fee</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                    Loading companies...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                    No companies found matching search.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{c.users[0]?.name || 'No Owner'}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{c.users[0]?.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {c.aiProvider}
                        </span>
                        <span className="text-xs text-slate-600 font-mono truncate max-w-[140px]" title={c.aiModel}>
                          {c.aiModel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {c.rawHasApiKey ? '✓ Custom Key Set' : 'Using System Default Key'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-700">
                        <span className="font-medium">{c._count.items}</span> items •{' '}
                        <span className="font-medium text-emerald-600">{c._count.orders}</span> orders
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold text-slate-800">
                        {c.currency}{c.deliveryFee.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Configure AI Button */}
                        <button
                          onClick={() => openAIModal(c)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-emerald-700 transition-colors shadow-2xs"
                          title="Configure AI API & Model"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>AI Config</span>
                        </button>

                        {/* Activate / Suspend Toggle */}
                        <button
                          onClick={() => toggleCompanyStatus(c)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-2xs ${
                            c.isActive
                              ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={c.isActive ? 'Suspend Company Access' : 'Activate Company Access'}
                        >
                          {c.isActive ? (
                            <>
                              <PowerOff className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </>
                          ) : (
                            <>
                              <Power className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Configuration Modal */}
      {editingAICompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Configure AI Layer</h3>
                  <p className="text-xs text-slate-500">{editingAICompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAICompany(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAI} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  AI Provider Engine
                </label>
                <select
                  value={aiForm.aiProvider}
                  onChange={(e) => {
                    const p = e.target.value;
                    let defaultModel = 'gemini-3.1-flash-lite';
                    if (p === 'openai') defaultModel = 'gpt-4o-mini';
                    if (p === 'openrouter') defaultModel = 'meta-llama/llama-3.3-70b-instruct';
                    setAiForm({ ...aiForm, aiProvider: p, aiModel: defaultModel });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="gemini">Google Gemini (Recommended / Arabic Supported)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="openrouter">OpenRouter / Custom OpenAI Compatible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Model Identifier
                </label>
                <input
                  type="text"
                  required
                  value={aiForm.aiModel}
                  onChange={(e) => setAiForm({ ...aiForm, aiModel: e.target.value })}
                  placeholder="e.g. gemini-3.1-flash-lite or gemini-3.8-flash"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Company API Key Override
                  </label>
                  <span className="text-[11px] text-slate-400">Leave blank to use system key</span>
                </div>
                <input
                  type="password"
                  value={aiForm.aiApiKey}
                  onChange={(e) => setAiForm({ ...aiForm, aiApiKey: e.target.value })}
                  placeholder={editingAICompany.rawHasApiKey ? '•••••••••••••••• (Leave blank to keep current)' : 'Enter custom API key'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {aiForm.aiProvider === 'openrouter' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Custom Base URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={aiForm.aiCustomBaseUrl}
                    onChange={(e) => setAiForm({ ...aiForm, aiCustomBaseUrl: e.target.value })}
                    placeholder="https://openrouter.ai/api/v1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom Store AI Instructions
                </label>
                <textarea
                  rows={3}
                  value={aiForm.aiSystemPrompt}
                  onChange={(e) => setAiForm({ ...aiForm, aiSystemPrompt: e.target.value })}
                  placeholder="e.g. Always suggest our garlic knots when the customer orders pizza!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAICompany(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Register Subscribed Company</h3>
                  <p className="text-xs text-slate-500">Add a new business tenant</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Golden Dragon Chinese Food"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+1 (555) 345-6789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Login Email</label>
                  <input
                    type="email"
                    required
                    value={createForm.ownerEmail}
                    onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                    placeholder="owner@restaurant.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Password</label>
                  <input
                    type="password"
                    required
                    value={createForm.ownerPassword}
                    onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
