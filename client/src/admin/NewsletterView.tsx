import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Mail, Download, Trash2, UserMinus, UserCheck } from 'lucide-react';

export const NewsletterView: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = () => {
    setLoading(true);
    api.getSubscribers()
      .then((data) => {
        if (Array.isArray(data)) setSubscribers(data);
      })
      .finally(() => setLoading(false));
  };

  const handleExportCsv = () => {
    window.location.href = '/api/newsletter/export';
  };

  const handleToggleStatus = async (sub: any) => {
    const newStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    setActionLoadingId(sub.id);
    try {
      await api.updateSubscriberStatus(sub.id, newStatus);
      setSubscribers((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert(`Failed to update subscriber status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (window.confirm(`Are you sure you want to permanently delete subscriber "${email}"? This action cannot be undone.`)) {
      setActionLoadingId(id);
      try {
        await api.deleteSubscriber(id);
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      } catch (err: any) {
        alert(`Failed to delete subscriber: ${err.message}`);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" /> Newsletter Subscribers
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Verified subscribers with consent timestamps, deletion, and one-click unsubscribe management.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> Export CSV List
        </button>
      </div>

      <div className="clay-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200/80 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Consent Timestamp</th>
              <th className="py-3 px-4">Unsubscribe Token</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                  {loading ? 'Loading subscribers...' : 'No subscribers found.'}
                </td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {sub.email}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      sub.status === 'subscribed'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {new Date(sub.consentTimestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                    {sub.unsubscribeToken}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(sub)}
                      disabled={actionLoadingId === sub.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        sub.status === 'subscribed'
                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                      title={sub.status === 'subscribed' ? 'Unsubscribe user' : 'Re-subscribe user'}
                    >
                      {sub.status === 'subscribed' ? (
                        <>
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Unsubscribe</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Subscribe</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                      disabled={actionLoadingId === sub.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete subscriber permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
