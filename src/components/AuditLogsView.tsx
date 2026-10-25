import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Activity, Key, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  details: string;
}

export const AuditLogsView: React.FC = () => {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/pbx/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Telephony Security, RBAC &amp; Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable system logs covering authentication attempts, user role access, DID routing alterations, and tool calls.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-2 border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Security Architecture Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs mb-1">
            <Lock className="w-4 h-4" />
            <span>Cryptographic Hashing</span>
          </div>
          <p className="text-xs text-slate-300">Scrypt with 16-byte random salts per account.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-1">
            <Key className="w-4 h-4" />
            <span>HMAC-SHA256 Signed Tokens</span>
          </div>
          <p className="text-xs text-slate-300">Protected Bearer authorization header with 24h expiration.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs mb-1">
            <Activity className="w-4 h-4" />
            <span>Current Tenant Context</span>
          </div>
          <p className="text-xs text-slate-300">
            {user?.companyName} ({user?.role.toUpperCase()})
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">System Security Activity Log ({logs.length})</h3>
          <span className="text-[11px] text-slate-500 font-mono">Live Ingestion Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Security Action</th>
                <th className="py-3 px-4">User / Subject</th>
                <th className="py-3 px-4">Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        log.action.includes('LOGIN')
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : log.action.includes('FAILED')
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          : 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{log.userId || 'system'}</td>
                  <td className="py-3 px-4 text-slate-200 font-sans">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
