import React, { useState, useEffect } from 'react';
import {
    Activity,
    MapPin,
    Server,
    ShieldAlert,
    Train,
    Clock,
    Zap,
    Navigation2,
    Cloud
} from 'lucide-react';
import MapComponent from '../components/MapComponent';

import { API } from '../config';

const DashboardPage: React.FC = () => {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [schedRes, logRes] = await Promise.all([
                fetch(`${API}/api/schedules`),
                fetch(`${API}/api/logs?limit=5`)
            ]);
            const [schedData, logData] = await Promise.all([
                schedRes.json(),
                logRes.json()
            ]);

            if (schedData.success) {
                setSchedules(schedData.schedules.slice(0, 4)); // Limit to top 4 for layout
            }
            if (logData.success) {
                setLogs(logData.logs || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Fast refresh for Command Center
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
            {/* Main Content Area */}
            <main className="flex-grow overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300">

                {/* TOP SECTION: Geolocation Situational Awareness */}
                <section className="relative w-full h-[380px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm group">
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Map Link: ACTIVE</span>
                        </div>
                        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                            <Navigation2 size={12} className="text-blue-600" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Tracking: LIVE</span>
                        </div>
                    </div>
                    <MapComponent />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50/50 to-transparent z-10 pointer-events-none" />
                </section>

                {/* MID SECTION: KPI Dashboard Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard
                        title="On-Time Performance"
                        value="98.4%"
                        status="success"
                        icon={<Clock size={20} />}
                        trend="+1.2%"
                    />
                    <StatCard
                        title="System Throughput"
                        value="420"
                        status="info"
                        icon={<Zap size={20} />}
                        trend="Active PKT"
                    />
                    <StatCard
                        title="Active Services"
                        value={`${schedules.length + 2}/12`}
                        status="success"
                        icon={<Activity size={20} />}
                        trend="100% Core"
                    />
                    <StatCard
                        title="System Load"
                        value="24.8%"
                        status="warning"
                        icon={<Server size={20} />}
                        trend="Normal"
                    />
                </section>

                {/* BOTTOM SECTION: Split view */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Detailed Status List */}
                    <section className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Fleet & Station Analytics</h2>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-[10px] bg-white border border-slate-200 rounded-lg shadow-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">EXPORT</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {loading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                                ))
                            ) : (
                                schedules.map((s, i) => (
                                    <TransportLineCard
                                        key={s.id || i}
                                        type="Train"
                                        id={s.display_ka_number || s.ka_number || 'KA'}
                                        status={s.status_keberangkatan || 'Normal'}
                                        load={Math.floor(Math.random() * 40) + 20} // Simulated occupancy
                                        eta={s.waktu_keberangkatan_penjadwalan}
                                        origin={s.stasiun_keberangkatan}
                                        dest={s.stasiun_tujuan}
                                    />
                                ))
                            )}
                            {!loading && schedules.length === 0 && (
                                <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                                    <p className="text-slate-400 font-bold text-sm">Tidak ada jadwal aktif terdeteksi.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Activity Logs / Sidebar Widgets */}
                    <section className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                <Activity size={16} className="text-blue-600" />
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">System Logs</h2>
                            </div>

                            <div className="flex-grow space-y-5 overflow-y-auto pr-1">
                                {logs.map((log, i) => (
                                    <LogItem 
                                        key={log.id || i} 
                                        time={new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 
                                        tag={log.role.toUpperCase()} 
                                        msg={log.action || log.details} 
                                        type={log.role === 'Admin' ? 'info' : 'success'} 
                                    />
                                ))}
                                {!loading && logs.length === 0 && (
                                    <p className="text-[10px] text-slate-400 italic text-center py-8">Belum ada aktivitas baru.</p>
                                )}
                            </div>

                            <button className="mt-6 w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                                View All Logs
                            </button>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
};

const StatCard: React.FC<{
    title: string;
    value: string;
    status: 'success' | 'warning' | 'error' | 'info';
    icon: React.ReactNode;
    trend?: string;
}> = ({ title, value, status, icon, trend }) => {
    const statusColors = {
        success: 'text-green-600 bg-green-50',
        warning: 'text-amber-600 bg-amber-50',
        error: 'text-rose-600 bg-rose-50',
        info: 'text-blue-600 bg-blue-50'
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl transition-colors duration-300 ${statusColors[status]}`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${statusColors[status]}`}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{title}</p>
                <p className="text-3xl font-black tracking-tight text-slate-900">{value}</p>
            </div>
        </div>
    );
};

const LogItem: React.FC<{ time: string, tag: string, msg: string, type: 'info' | 'success' | 'warning' }> = ({ time, tag, msg, type }) => {
    const typeStyles = {
        info: 'text-blue-600',
        success: 'text-green-600',
        warning: 'text-amber-600'
    };

    return (
        <div className="text-[11px] leading-relaxed group hover:bg-slate-50 p-1 rounded-lg transition-colors">
            <div className="flex gap-3 items-center">
                <span className="text-slate-400 tabular-nums shrink-0 font-medium">{time}</span>
                <span className={`text-[9px] font-black tracking-wider shrink-0 uppercase ${typeStyles[type]}`}>{tag}</span>
                <span className="text-slate-600 font-medium truncate">{msg}</span>
            </div>
        </div>
    );
};

const TransportLineCard: React.FC<{
    type: 'Train' | 'Station';
    id: string;
    status: string;
    load: number;
    eta: string;
    origin: string;
    dest: string;
}> = ({ type, id, status, load, eta, origin, dest }) => {
    const isWarning = load > 80 || status !== 'Normal';

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-200 transition-all hover:shadow-md group">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {type === 'Train' ? (
                        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><Train size={14} /></div>
                    ) : (
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><MapPin size={14} /></div>
                    )}
                    <span className="text-sm font-black text-slate-900">{id}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase ${status === 'Normal' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {status}
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] text-slate-400 font-black uppercase">Capacity</span>
                    <span className={`text-[10px] font-black ${isWarning ? 'text-amber-600' : 'text-slate-900'}`}>{load}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-700 rounded-full ${isWarning ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: `${load}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Route</p>
                    <p className="text-[10px] font-bold text-slate-700">{origin} → {dest}</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-slate-400 font-bold uppercase">In</p>
                    <p className="text-sm font-black text-blue-600">{eta}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
