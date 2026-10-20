import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Mail, Download, Trash2, UserMinus, UserCheck, ShieldCheck, Users } from 'lucide-react';

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

  const activeSubscribers = subscribers.filter(s => s.status === 'subscribed').length;
  const unsubscribedCount = subscribers.filter(s => s.status === 'unsubscribed').length;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" />
            <span>Newsletter Subscribers</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Verified subscribers with consent records, one-click unsubscribe tokens, and CSV exports.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV List</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Audience</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{subscribers.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Subscribers</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{activeSubscribers}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Unsubscribed</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{unsubscribedCount}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Subscriber Directory
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {subscribers.length} total entries
          </span>
        </div>

        <div className="overflow-x-auto -mx-5 sm:mx-0">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200/80 dark:border-white/[0.06]">
              <tr>
                <th className="py-2.5 px-3">Subscriber Email</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Consent Timestamp</th>
                <th className="py-2.5 px-3">Unsubscribe Token</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">Loading subscribers...</td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">No subscribers registered yet.</td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white font-mono text-xs">
                      {sub.email}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sub.status === 'subscribed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(sub.consentTimestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                      {sub.unsubscribeToken}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(sub)}
                          disabled={actionLoadingId === sub.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                            sub.status === 'subscribed'
                              ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
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
                              <span>Re-subscribe</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          disabled={actionLoadingId === sub.id}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete subscriber permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
