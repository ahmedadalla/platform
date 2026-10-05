import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PowerOff,
  Smartphone,
  Send,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl?: string | null;
  phoneNumber?: string | null;
}

export const WhatsAppConnect: React.FC = () => {
  const [waState, setWaState] = useState<WhatsAppStatus>({ status: 'DISCONNECTED' });
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  // Sandbox test chat state
  const [testInput, setTestInput] = useState('');
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: "👋 Hi! I'm your AI WhatsApp Assistant. Scan the QR code to connect your real WhatsApp number, or test my answers and order taking right here!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaState(res.data);
    } catch (err) {
      console.error('Failed to get WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen to real-time WhatsApp status events via WebSockets
    if (socket) {
      socket.on('whatsapp:status', (data: WhatsAppStatus) => {
        setWaState(data);
        setLoading(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('whatsapp:status');
      }
    };
  }, [socket]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/connect');
      fetchStatus();
    } catch (err) {
      alert('Failed to initialize WhatsApp pairing');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? Your bot will stop taking automated orders.')) return;
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWaState({ status: 'DISCONNECTED' });
    } catch (err) {
      alert('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || sendingTest) return;

    const userMsg = testInput.trim();
    setTestInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatLog((prev) => [...prev, { sender: 'user', text: userMsg, time: now }]);
    setSendingTest(true);

    try {
      const res = await api.post('/whatsapp/simulate-message', { text: userMsg });
      setChatLog((prev) => [
        ...prev,
        { sender: 'bot', text: res.data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (err: any) {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '❌ Error: ' + (err.response?.data?.error || 'Failed to process message'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp QR Connection</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pair your business or staff WhatsApp phone using a QR scan to automate customer orders and replies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: QR Code & Status (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Device Pairing</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      waState.status === 'CONNECTED'
                        ? 'bg-emerald-500 animate-pulse'
                        : waState.status === 'QR_READY'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {waState.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {waState.status === 'CONNECTED' ? (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {waState.status === 'QR_READY' ? 'Refresh QR' : 'Pair WhatsApp'}
              </button>
            )}
          </div>

          <div className="p-8">
            {waState.status === 'CONNECTED' ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">WhatsApp is Live & Connected!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Active Business Number:{' '}
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    +{waState.phoneNumber || 'Connected Phone'}
                  </span>
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
                  Your AI Bot is continuously listening for customer orders and questions. Incoming messages will be automatically handled.
                </p>
              </div>
            ) : waState.status === 'QR_READY' && waState.qrCodeDataUrl ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-md">
                  <img
                    src={waState.qrCodeDataUrl}
                    alt="WhatsApp Pairing QR Code"
                    className="w-56 h-56 object-contain"
                  />
                  <div className="text-[11px] text-center text-slate-500 mt-2 font-medium">
                    Auto-refreshes periodically
                  </div>
                </div>

                <div className="space-y-3 max-w-xs text-left">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    How to Link Your WhatsApp:
                  </h4>
                  <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Open <strong>WhatsApp</strong> on your mobile device.</li>
                    <li>Tap <strong>Settings</strong> or the <strong>Three Dots</strong> (⋮).</li>
                    <li>Select <strong>Linked Devices</strong>.</li>
                    <li>Tap <strong>Link a Device</strong>.</li>
                    <li>Point your phone camera at this QR code to scan.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">WhatsApp Not Connected</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Click the button below to generate a dynamic pairing QR code. No Meta API approval or credit card required.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Initializing Session...' : 'Generate Pairing QR Code'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Sandbox Simulator (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[560px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bot Simulator Sandbox</h3>
                <p className="text-[10px] text-slate-500">Test orders & FAQs before scanning QR</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Live AI
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setTestInput('What is on your menu?')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md shrink-0 transition-colors"
            >
              📋 Show Menu
            </button>
            <button
              type="button"
              onClick={() => setTestInput('I want to order 1 Margherita Pizza to 123 Main St for John')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md shrink-0 transition-colors"
            >
              🍕 Order Pizza
            </button>
            <button
              type="button"
              onClick={() => setTestInput('What are your store hours and delivery fee?')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md shrink-0 transition-colors"
            >
              🕒 Store Hours
            </button>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendTestMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Ask menu, hours, or place an order..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={sendingTest || !testInput.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
