/** /command-center-app/src/App.tsx — untuk mengubah: komponen PIDS; fungsi utama: App */

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Train,
  MapPin,
  Users,
  ScrollText,
  LogOut,
  Clock,
  Shield,
  Building2,
  Calendar,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  AlertTriangle,
  Info,
  Settings,
} from "lucide-react";
import { API } from "./config";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TrainsPage = lazy(() => import("./pages/TrainsPage"));
const StationsPage = lazy(() => import("./pages/StationsPage"));
const RoutesPage = lazy(() => import("./pages/RoutesPage"));
const SchedulesPage = lazy(() => import("./pages/SchedulesPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

interface AuthUser {
  id: string;
  username: string;
  role: string;
  nama: string;
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "trains", label: "Manajemen Kereta", icon: Train },
  { id: "stations", label: "Manajemen Stasiun", icon: Building2 },
  { id: "routes", label: "Manajemen Rute", icon: MapPin },
  { id: "schedules", label: "Jadwal Kereta", icon: Calendar },
  { id: "users", label: "Akun Operator", icon: Users },
  { id: "logs", label: "System Logs", icon: ScrollText },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 font-bold text-base animate-pulse">
      Memuat halaman...
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  const [headerTitle, setHeaderTitle] = useState<React.ReactNode>(null);

  const [isDark, setIsDark] = useState(() => localStorage.getItem("cc_theme") === "dark");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, type: "warning", msg: "Koneksi GPS KA Malabar tidak stabil", time: "15 menit lalu" },
    { id: 2, type: "info", msg: "Update jadwal KA Parahyangan berhasil", time: "1 jam lalu" },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => [
        { id: Date.now(), type: "danger", msg: "DARURAT: KA Argo Wilis Terdeteksi Berhenti di Luar Stasiun (KM 102)", time: "Baru saja" },
        ...prev
      ]);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("cc_theme", isDark ? "dark" : "light");
  }, [isDark]);
  useEffect(() => {
    const token = sessionStorage.getItem("cc_token");
    const userStr = sessionStorage.getItem("cc_user");
    if (token && userStr) {
      fetch(`${API}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.user.role === "Admin") {
            setAuthToken(token);
            setAuthUser(JSON.parse(userStr));
          } else {
            sessionStorage.removeItem("cc_token");
            sessionStorage.removeItem("cc_user");
          }
        })
        .catch(() => {
          setAuthToken(token);
          setAuthUser(JSON.parse(userStr ?? ""));
        });
    }
  }, []);
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = (user: AuthUser, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch { }
    sessionStorage.removeItem("cc_token");
    sessionStorage.removeItem("cc_user");
    setAuthUser(null);
    setAuthToken("");
  };

  if (!authUser)
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage onLogin={handleLogin} />
      </Suspense>
    );

  const pageComponents: Record<string, any> = {
    dashboard: DashboardPage,
    trains: TrainsPage,
    stations: StationsPage,
    routes: RoutesPage,
    schedules: SchedulesPage,
    users: UsersPage,
    logs: LogsPage,
    settings: SettingsPage,
    notifications: NotificationsPage,
  };

  const ActivePageComponent = pageComponents[activePage];

  const visibleNav = NAV.filter(item => {
    if (authUser?.role === "Operator") {
      return !["users", "logs"].includes(item.id);
    }
    return true;
  });

  return (
    <div className={`flex h-screen w-full bg-[#f8fafc] dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden ${isDark ? "dark" : ""}`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-[40]"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed lg:relative inset-y-0 left-0 w-80 bg-[#1d2d6a] dark:bg-slate-900 border-r border-blue-900 dark:border-slate-800 flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] z-[50] transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-8 pb-10 flex justify-between items-start">
          <div>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
              alt="KAI Logo"
              className="h-10 w-auto mb-6 brightness-0 invert"
            />
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
              Command Center
            </h1>
            <p className="text-base font-semibold text-blue-200/40 mt-1 font-mono tracking-[0.1em]">
              Control Panel
            </p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold text-base ${activePage === item.id ? "bg-[#ee6f1f] text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)]" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              <item.icon size={22} strokeWidth={2.5} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-xs border border-white/5 active:scale-95 group"
          >
            <LogOut
              size={18}
              className="text-white/20 group-hover:text-red-400 transition-colors"
            />
            <span>SYSTEM LOGOUT</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col relative bg-[#f8fafc] dark:bg-slate-900">
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-[#1d2d6a] dark:text-slate-300">
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              {(() => {
                const Icon =
                  NAV.find((n) => n.id === activePage)?.icon || Shield;
                return (
                  <Icon
                    className="text-[#1d2d6a] dark:text-slate-300"
                    size={20}
                    strokeWidth={2.5}
                  />
                );
              })()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {headerTitle ? (
                  <div className="flex items-center gap-2">{headerTitle}</div>
                ) : (
                  <span className="text-lg lg:text-xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-normal">
                    {NAV.find((n) => n.id === activePage)?.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-6">
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-2 lg:pr-6">
              <div className="relative">
                <button
                  ref={bellButtonRef}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? "bg-[#ee6f1f] text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white"}`}
                >
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      ref={notificationRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <span className="font-semibold text-sm dark:text-white">Notifications</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase cursor-pointer">Mark all as read</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((n) => (
                          <div key={n.id} className="p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex gap-3">
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${n.type === 'danger' ? 'bg-red-50 text-red-500' : n.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                              {n.type === 'danger' ? <AlertTriangle size={16} /> : <Info size={16} />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight mb-1">{n.msg}</p>
                              <p className="text-[10px] font-medium text-slate-400">{n.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setActivePage("notifications");
                          setShowNotifications(false);
                        }}
                        className="w-full py-3 text-[10px] font-bold uppercase text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-colors border-t border-slate-50 dark:border-slate-700/50"
                      >
                        View History
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[#1d2d6a] dark:text-white">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-slate-400">
                <Clock size={20} />
              </div>
              <span className="text-xl lg:text-3xl font-bold font-mono tracking-tighter opacity-90">
                {currentTime.toLocaleTimeString("id-ID", { hour12: false })}
              </span>
            </div>
          </div>
        </header>
        <div
          className={`flex-1 overflow-auto ${(activePage === "dashboard" || activePage === "routes" || activePage === "stations" || activePage === "notifications") ? "p-0" : "p-6 lg:p-10"} bg-[#f8fafc] dark:bg-slate-900`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Suspense fallback={<PageLoader />}>
                <ActivePageComponent
                  token={authToken}
                  setHeader={setHeaderActions}
                  setHeaderTitle={setHeaderTitle}
                  setPage={setActivePage}
                  isDark={isDark}
                  setIsDark={setIsDark}
                />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
