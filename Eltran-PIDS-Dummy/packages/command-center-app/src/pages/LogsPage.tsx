/** /command-center-app/src/pages/LogsPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: LogsPage */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import { io } from "socket.io-client";
import { API } from "../config";

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  role: string;
  details: string;
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  LOGIN: {
    label: "Login",
    color: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20",
  },
  LOGIN_FAILED: {
    label: "Login Gagal",
    color: "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20",
  },
  LOGOUT: {
    label: "Logout",
    color: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  },
  STATE_UPDATE: {
    label: "Update State",
    color: "text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  DISPLAY_MODE: {
    label: "Mode Display",
    color: "text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  LED_CONFIG: {
    label: "LED Config",
    color: "text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  ADMIN_CRUD: {
    label: "Admin CRUD",
    color: "text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  SYSTEM: {
    label: "Sistem",
    color: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  },
};

export default function LogsPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const fetchLogs = useCallback(
    async (isLoadMore = false, currentFilter = filter) => {
      try {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        const currentOffset = isLoadMore ? offset + LIMIT : 0;
        const query = new URLSearchParams({
          action: currentFilter,
          limit: LIMIT.toString(),
          offset: currentOffset.toString(),
        });

        const res = await fetch(`${API}/api/logs?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();

        if (d.success) {
          if (isLoadMore) {
            setLogs((prev) => [...prev, ...d.logs]);
          } else {
            setLogs(d.logs);
          }
          setTotal(d.total);
          setOffset(currentOffset);
        }
      } catch {
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, filter, offset],
  );

  useEffect(() => {
    fetchLogs(false);
    const socket = io(API, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socket.on("state:update", () => fetchLogs(false));
    socket.on("db:update", () => fetchLogs(false));
    return () => {
      socket.disconnect();
    };
  }, [token]); // Only token as dependency for mount, fetchLogs handles the rest

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setOffset(0);
    fetchLogs(false, newFilter);
  };

  const filterOptions = ["ALL", ...Object.keys(ACTION_META)];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1d2d6a] dark:text-white">
            Log Sistem
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
            {logs.length} entri total
          </p>
        </div>
        <button
          onClick={() => fetchLogs(false)}
          className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 dark:text-slate-500 hover:text-[#1d2d6a] dark:hover:text-white hover:border-[#1d2d6a] dark:hover:border-slate-700 transition-all active:scale-95"
        >
          <RefreshCcw size={16} />
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => handleFilterChange(opt)}
            className={`h-9 px-4 rounded-xl text-[10px] font-bold border transition-all ${filter === opt ? "bg-[#ee6f1f] text-white border-[#ee6f1f]" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
          >
            {opt === "ALL" ? "Semua" : ACTION_META[opt]?.label || opt}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        <div className="grid grid-cols-[140px_120px_110px_80px_1fr] gap-0 px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors">
          <span>Waktu</span>
          <span>Aksi</span>
          <span>Pengguna</span>
          <span>Role</span>
          <span>Keterangan</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto transition-colors">
          {logs.map((log, i) => {
            const meta = ACTION_META[log.action] || {
              label: log.action,
              color: "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            };
            const dt = new Date(log.timestamp);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
                className="grid grid-cols-[140px_120px_110px_80px_1fr] gap-0 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors items-start"
              >
                <div className="font-mono text-[11px] font-semibold pt-1">
                  <div className="text-slate-500 dark:text-slate-400">
                    {dt.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500">
                    {dt.toLocaleTimeString("id-ID", { hour12: false })}
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold border mt-0.5 ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <span className="text-[#1d2d6a] dark:text-white text-sm font-semibold self-center">
                  {log.user}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold self-center">
                  {log.role}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-sm font-semibold self-center pr-6">
                  {log.details}
                </span>
              </motion.div>
            );
          })}
          {logs.length < total && (
            <div className="p-6 text-center bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
              <button
                onClick={() => fetchLogs(true)}
                disabled={loadingMore}
                className="px-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-[#1d2d6a] dark:text-white hover:border-[#ee6f1f] hover:text-[#ee6f1f] transition-all disabled:opacity-50"
              >
                {loadingMore
                  ? "Memuat..."
                  : `Muat Selebihnya (${total - logs.length} tersisa)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
