import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Mail, Download, Trash2, UserMinus, UserCheck, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table.js';
import { StatusDot } from '@/components/ui/status-dot.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { RollingDigits } from '@/components/ui/rolling-digits.js';

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
            <Mail className="w-6 h-6 text-primary" />
            <span>Newsletter Subscribers</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Subscribers, consent records, and CSV exports.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleExportCsv}
          icon={<Download className="w-4 h-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card interactive>
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Audience</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                <RollingDigits value={subscribers.length} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card interactive>
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Subscribers</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                <RollingDigits value={activeSubscribers} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card interactive>
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Unsubscribed</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                <RollingDigits value={unsubscribedCount} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Subscriber Directory</CardTitle>
              <CardDescription>
                Audience engagement records and cryptographic delivery tokens
              </CardDescription>
            </div>
            <Badge variant="outline" size="sm">
              {subscribers.length} total entries
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Consent Timestamp</TableHead>
                <TableHead>Unsubscribe Token</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-7 w-24 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                    No subscribers registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-white font-mono text-xs">
                      {sub.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={sub.status === 'subscribed' ? 'success' : 'destructive'}
                        size="sm"
                        dot
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(sub.consentTimestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-[10px] max-w-xs truncate">
                      {sub.unsubscribeToken}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleToggleStatus(sub)}
                          loading={actionLoadingId === sub.id}
                          className={
                            sub.status === 'subscribed'
                              ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }
                          icon={
                            sub.status === 'subscribed' ? (
                              <UserMinus className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )
                          }
                        >
                          {sub.status === 'subscribed' ? 'Unsubscribe' : 'Re-subscribe'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          disabled={actionLoadingId === sub.id}
                          title="Delete subscriber permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewsletterView;
