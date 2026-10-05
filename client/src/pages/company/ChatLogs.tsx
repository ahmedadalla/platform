import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { MessageSquare, Phone, Clock, User, Bot } from 'lucide-react';

interface Conversation {
  id: string;
  customerPhone: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string;
  messages: { role: string; content: string }[];
}

export const ChatLogs: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
      if (res.data.length > 0 && !selectedConvo) {
        setSelectedConvo(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    if (socket) {
      socket.on('chat:message', () => {
        fetchConversations();
      });
    }

    return () => {
      if (socket) {
        socket.off('chat:message');
      }
    };
  }, [socket]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Conversations</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Live WhatsApp transcripts of customer inquiries and automated bot responses.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left: Chat List (4 cols) */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Active Threads ({conversations.length})
            </h3>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No customer chats yet</div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConvo?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvo(c)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-xs font-bold">
                      <Phone className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {c.customerPhone}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-1">{c.lastMessage}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Stream (8 cols) */}
        <div className="md:col-span-8 flex flex-col bg-slate-50/40">
          {selectedConvo ? (
            <>
              <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{selectedConvo.customerPhone}</h3>
                    <p className="text-[11px] text-slate-400">
                      Last active: {new Date(selectedConvo.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                {selectedConvo.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                          : 'bg-emerald-600 text-white rounded-tr-xs'
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role !== 'user' && (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Select a conversation to view transcript
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
