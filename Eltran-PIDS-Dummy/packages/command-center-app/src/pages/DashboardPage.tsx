import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Train, Users, ScrollText, Server, Wifi, Activity, Navigation, Map as MapIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { API } from '../config';

// ---- GPS Fleet Sub-Panel ----
function GpsFleetPanel() {
    const [fleet, setFleet] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

    useEffect(() => {
        const fetchFleet = async () => {
            try {
                const res = await fetch(`${API}/api/gps/fleet`);
                const d = await res.json();
                if (d.success) setFleet(d.fleet);
            } catch { } finally { setLoading(false); }
        };
        fetchFleet();
        const interval = setInterval(fetchFleet, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!mapContainer.current) return;

        const darkStyle: maplibregl.StyleSpecification = {
            version: 8,
            sources: {
                'carto-dark': {
                    type: 'raster',
                    tiles: [
                        'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                }
            },
            layers: [{
                id: 'carto-dark-layer',
                type: 'raster',
                source: 'carto-dark',
                minzoom: 0,
                maxzoom: 19
            }]
        };

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: darkStyle,
            center: [107.6036, -6.9125], // Default center
            zoom: 8,
            pitch: 45,
            attributionControl: false
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    useEffect(() => {
        if (!map.current) return;

        const currentMarkerIds = new Set<string>();

        fleet.forEach((train) => {
            const id = train.kereta_id || train.ka_number || train.kereta_name;
            const lng = train.longitude;
            const lat = train.latitude;

            if (lng && lat && id) {
                currentMarkerIds.add(String(id));

                if (markersRef.current[id]) {
                    // Update existing marker
                    markersRef.current[id].setLngLat([lng, lat]);
                    
                    // Optional: update popup content if changed
                    const popup = markersRef.current[id].getPopup();
                    if (popup) {
                         popup.setHTML(`
                            <div class="text-[#1d2d6a] font-black w-max">
                                ${train.kereta_name} <br/>
                                <span class="text-xs text-slate-500">${train.ka_number || ''}</span><br/>
                                <span class="text-[#ee6f1f]">${train.kecepatan?.toFixed(1) || '0'} km/h</span>
                            </div>
                        `);
                    }

                } else {
                    // Create new marker
                    const el = document.createElement('div');
                    el.className = 'w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-[0_0_10px_rgba(34,197,94,0.8)]';
                    
                    const popup = new maplibregl.Popup({ offset: 15, closeButton: false, closeOnClick: false }).setHTML(`
                        <div class="text-[#1d2d6a] font-black w-max">
                            ${train.kereta_name} <br/>
                            <span class="text-xs text-slate-500">${train.ka_number || ''}</span><br/>
                            <span class="text-[#ee6f1f]">${train.kecepatan?.toFixed(1) || '0'} km/h</span>
                        </div>
                    `);

                    const marker = new maplibregl.Marker({ element: el })
                        .setLngLat([lng, lat])
                        .setPopup(popup)
                        .addTo(map.current!);
                    
                    // Show popup on hover
                    el.addEventListener('mouseenter', () => marker.togglePopup());
                    el.addEventListener('mouseleave', () => marker.togglePopup());

                    markersRef.current[id] = marker;
                }
            }
        });

        // Remove old markers
        Object.keys(markersRef.current).forEach((id) => {
            if (!currentMarkerIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Fit map bounds to show all active markers if there are any
        if (fleet.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            let hasValidCoords = false;
            fleet.forEach((train) => {
                if (train.longitude && train.latitude) {
                    bounds.extend([train.longitude, train.latitude]);
                    hasValidCoords = true;
                }
            });
            
            if (hasValidCoords && map.current) {
                map.current.fitBounds(bounds, { padding: 50, duration: 1000, maxZoom: 12 });
            }
        }

    }, [fleet]);

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 mb-5 flex items-center gap-2">
                <Navigation size={16} className="text-[#ee6f1f]" /> GPS Fleet Monitoring
                <span className="ml-auto text-[10px] font-bold text-slate-300 tracking-normal normal-case">Auto-refresh 10s</span>
            </h3>
            {loading ? <div className="text-slate-400 text-sm text-center py-6">Memuat data GPS...</div> : (
                <div className="flex flex-col gap-6">
                    {/* Fleet Map View Wide */}
                    <div className="w-full h-[500px] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner">
                        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                            <MapIcon size={14} className="text-[#1d2d6a]" />
                            <span className="text-[10px] font-black text-[#1d2d6a] uppercase tracking-wider">Live Map</span>
                        </div>
                        <div ref={mapContainer} className="w-full h-full" />
                    </div>

                    {/* Fleet List List Below */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {fleet.length === 0 ? (
                             <div className="col-span-full text-slate-400 text-sm text-center py-6 border border-dashed rounded-2xl">Tidak ada armada aktif ditemukan</div>
                        ) : fleet.map((train, i) => (
                            <motion.div key={train.kereta_id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span className="text-[#1d2d6a] font-black text-sm flex-1">{train.kereta_name}</span>
                                    <span className="text-slate-400 text-[10px] font-bold">{train.ka_number}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Lokasi</span><span className="text-slate-600 font-medium">{train.poi || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Koordinat</span><span className="text-slate-500 font-mono text-[10px]">{train.latitude?.toFixed(4)}, {train.longitude?.toFixed(4)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Kecepatan</span><span className="text-[#ee6f1f] font-black">{train.kecepatan?.toFixed(1) || '0'} km/h</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Suhu</span><span className="text-slate-600 font-medium">{train.suhu?.toFixed(1) || '-'}°C</span></div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- Dashboard Page ----
export default function DashboardPage({ token }: { token: string }) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/status`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setStatus(d.status);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        fetch_();
        const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true });
        socket.on('state:update', () => fetch_());
        socket.on('connect', () => console.log('[Socket.IO] Command Center dashboard connected'));
        return () => { socket.disconnect(); };
    }, [fetch_]);

    const ACTION_COLOR: Record<string, string> = {
        LOGIN: 'text-green-400', LOGIN_FAILED: 'text-red-400', LOGOUT: 'text-slate-400',
        STATE_UPDATE: 'text-blue-400', DISPLAY_MODE: 'text-purple-400',
        LED_CONFIG: 'text-orange-400', ADMIN_CRUD: 'text-indigo-400', SYSTEM: 'text-slate-500',
    };

    const cards = loading ? [] : [
        { label: 'Active Route', value: status?.currentState?.serviceName || '-', sub: `No. ${status?.currentState?.trainNumber || '-'}`, icon: Train, color: 'bg-blue-500' },
        { label: 'Active Sessions', value: status?.activeSessions ?? 0, sub: 'Login aktif', icon: Users, color: 'bg-green-500' },
        { label: 'Total Log Entries', value: status?.totalLogs ?? 0, sub: 'Semua aktivitas', icon: ScrollText, color: 'bg-orange-500' },
        { label: 'Server Uptime', value: status ? `${Math.floor(status.uptime / 60)}m` : '-', sub: 'Sejak start', icon: Server, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1">Dashboard Overview</h2>
                <p className="text-slate-500 text-sm font-medium">Status sistem PIDS secara real-time</p>
            </div>
            <div className="grid grid-cols-4 gap-6">
                {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-[2rem] animate-pulse" />) : cards.map((c, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 ${c.color} rounded-2xl flex items-center justify-center shadow-sm`}><c.icon size={24} className="text-white" /></div>
                        <div>
                            <div className="text-3xl font-black text-[#1d2d6a] tracking-tight">{String(c.value)}</div>
                            <div className="text-slate-400 text-xs font-bold mt-1">{c.label}</div>
                            <div className="text-slate-400/80 text-[10px] font-medium mt-0.5">{c.sub}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {status?.lastLog && (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 mb-4 flex items-center gap-2"><Activity size={16} className="text-[#ee6f1f]" /> Log Terakhir</h3>
                    <div className="flex items-start gap-4">
                        <div className={`text-sm font-black ${ACTION_COLOR[status.lastLog.action] || 'text-slate-400'}`}>{status.lastLog.action}</div>
                        <div className="text-slate-600 text-sm font-medium flex-1">{status.lastLog.details}</div>
                        <div className="text-slate-400 text-xs font-mono font-medium whitespace-nowrap">{new Date(status.lastLog.timestamp).toLocaleTimeString('id-ID')}</div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                {[
                    { name: 'Master API Server', port: '3001', ok: !!status },
                    { name: 'Selector App', port: '5174', ok: true },
                    { name: 'LED Display App', port: '5175', ok: true },
                ].map((unit, i) => (
                    <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${unit.ok ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'}`} />
                        <div>
                            <div className="text-[#1d2d6a] font-bold text-sm">{unit.name}</div>
                            <div className="text-slate-400 text-xs font-mono font-medium mt-0.5">Port: {unit.port}</div>
                        </div>
                        <Wifi size={20} className={`ml-auto ${unit.ok ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                ))}
            </div>

            <GpsFleetPanel />
        </div>
    );
}
