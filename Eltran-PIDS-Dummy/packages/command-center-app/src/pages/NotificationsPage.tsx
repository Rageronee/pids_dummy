/** /command-center-app/src/pages/NotificationsPage.tsx — untuk mengubah: halaman riwayat notifikasi; fungsi utama: NotificationsPage */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  MoreVertical,
  Activity,
  Shield
} from "lucide-react";

const NotificationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "danger",
      title: "KA Argo Wilis Emergency Stop",
      msg: "CRITICAL: KA Argo Wilis detected stopping outside station boundaries (KM 102). Immediate operator intervention required.",
      time: "2026-04-23 09:05:12",
      status: "unread",
      category: "Operational"
    },
    {
      id: 2,
      type: "warning",
      title: "KA Malabar GPS Instability",
      msg: "GPS telemetry for KA Malabar has been intermittent for 5+ minutes. Monitoring node status.",
      time: "2026-04-23 08:50:45",
      status: "read",
      category: "System"
    },
    {
      id: 3,
      type: "info",
      title: "Schedule Sync Complete",
      msg: "KA Parahyangan updated schedules have been successfully propagated to all gerbong units.",
      time: "2026-04-23 08:12:30",
      status: "read",
      category: "Update"
    },
    {
      id: 4,
      type: "success",
      title: "Daily Backup Succeeded",
      msg: "Full system state backup completed. Integrity verification passed across all data clusters.",
      time: "2026-04-22 23:59:59",
      status: "read",
      category: "System"
    },
    {
      id: 5,
      type: "warning",
      title: "Thermal Alert: Server Rack A3",
      msg: "Ambient temperature in Rack A3 reached 42°C. Cooling systems are operating at peak capacity.",
      time: "2026-04-22 14:22:10",
      status: "read",
      category: "Hardware"
    }
  ]);

  const filtered = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.msg.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "ALL" ||
      (activeFilter === "UNREAD" && n.status === "unread") ||
      (activeFilter === "DANGER" && n.type === "danger");
    return matchesSearch && matchesFilter;
  });

  const stats = [
    { label: "Total", value: notifications.length, icon: Activity, color: "text-blue-400", bg: "from-blue-500/10 to-transparent" },
    { label: "Unread", value: notifications.filter(n => n.status === "unread").length, icon: Bell, color: "text-[#ee6f1f]", bg: "from-orange-500/10 to-transparent" },
    { label: "Critical", value: notifications.filter(n => n.type === "danger").length, icon: AlertTriangle, color: "text-red-500", bg: "from-red-500/10 to-transparent" },
  ];

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Immersive Background Decorations */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section - Compact */}
      <div className="relative z-10 px-6 lg:px-10 pt-8 pb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-2 uppercase">
              Notifications
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-[#ee6f1f] rounded-full animate-pulse" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Real-time feed of system events and operational alerts
              </p>
            </div>
          </div>

          {/* Compact Stats Cards */}
          <div className="flex flex-wrap gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className={`relative group overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 p-3.5 px-5 rounded-2xl flex items-center justify-between gap-4 min-w-[150px] transition-all hover:border-[#ee6f1f]/30`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-30`} />
                <div className="relative z-10">
                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-0.5">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color} tracking-tighter`}>{s.value}</div>
                </div>
                <div className={`relative z-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 ${s.color} shadow-inner`}>
                  <s.icon size={16} strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar & Content Wrapper */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Sticky Toolbar - Compact */}
        <div className="sticky top-0 z-30 px-6 lg:px-10 py-3 backdrop-blur-xl bg-[#f8fafc]/80 dark:bg-slate-950/80 border-y border-slate-200 dark:border-white/5">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl shadow-sm">
              {[
                { id: "ALL", label: "All", icon: Activity },
                { id: "UNREAD", label: "Unread", icon: Bell },
                { id: "DANGER", label: "Critical", icon: AlertTriangle },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilter(opt.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${activeFilter === opt.id
                    ? "bg-[#ee6f1f] text-white shadow-md shadow-orange-500/10"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                >
                  <opt.icon size={12} strokeWidth={3} />
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ee6f1f] transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/10 rounded-xl text-[11px] font-semibold transition-all outline-none dark:text-white shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, status: "read" })))}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-400 hover:text-[#ee6f1f] transition-all shadow-sm"
                  title="Mark all as read"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm" title="Clear all logs">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Feed - Compact Cards */}
        <div className="px-6 lg:px-10 py-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-3.5 max-w-6xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className={`group relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-[1.5rem] border transition-all hover:shadow-xl hover:-translate-y-0.5 ${n.status === 'unread'
                    ? 'border-[#ee6f1f]/30 shadow-lg shadow-[#ee6f1f]/5'
                    : 'border-slate-200 dark:border-white/5'
                    }`}
                >
                  {/* Slim Status Indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${n.type === 'danger' ? 'bg-red-500' :
                    n.type === 'warning' ? 'bg-amber-500' :
                      n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />

                  <div className="p-5 lg:p-6 flex flex-col md:flex-row gap-5 items-start md:items-center">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] ${n.type === 'danger' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                          {n.category}
                        </span>

                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                          <Clock size={10} strokeWidth={3} />
                          {n.time}
                        </div>

                        {n.status === 'unread' && (
                          <div className="flex items-center gap-1.5 bg-[#ee6f1f]/10 px-2 py-0.5 rounded-full border border-[#ee6f1f]/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ee6f1f] animate-pulse" />
                            <span className="text-[10px] font-bold text-[#ee6f1f] uppercase tracking-[0.2em]">Active</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className={`text-sm lg:text-base font-bold tracking-tight ${n.status === 'unread' ? 'text-[#1d2d6a] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {n.title}
                        </h3>
                        <p className="text-[11px] lg:text-xs font-semibold text-slate-500 dark:text-slate-500 leading-normal max-w-4xl">
                          {n.msg}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-[#ee6f1f] transition-all">
                          <ExternalLink size={10} strokeWidth={3} />
                          <span>View Trace</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 size={10} strokeWidth={3} />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>

                    <div className="md:w-20 flex flex-row md:flex-col items-center justify-center gap-3 md:border-l border-slate-100 dark:border-white/5 md:pl-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${n.type === 'danger' ? 'bg-red-500/10 text-red-500' :
                        n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                          n.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                        {n.type === 'danger' ? <AlertTriangle size={20} /> :
                          n.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 shadow-xl">
                  <Bell size={28} strokeWidth={1} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.2em]">System Clear</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">No active logs matching filter.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
