import { useState, useEffect, useRef } from 'react';
import { usePidsData } from './hooks/usePidsData';
import { LayoutDashboard, Clock, AlertCircle, MapPin, Video, Database, Train, Activity, ScrollText, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginScreen } from './components/LoginScreen';
import { MasterConsolePanel } from './components/MasterConsolePanel';
import type { AuthUser, LogEntry } from '@eltran/pids-core';

import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

const API_URL = 'http://localhost:3001';

// --- Monitor CCTV Component ---
const MonitorCCTV = ({ data: _data }: { data: any }) => {
    const cameras = [
        { id: 'CAM-01', location: 'GERBONG 05 - DEPAN', url: "https://img.harianjogja.com/posts/2024/03/26/1169359/kereta-api-ekonomi-generasi-baru.jpg" },
        { id: 'CAM-02', location: 'GERBONG 05 - BELAKANG', url: "https://image.fortuneidn.com/post/20250821/upload_e179f189ddfbf16b0482c14a7295b474_2940c5af-a990-4232-ad05-4c52dd5d0431.jpg" },
        { id: 'CAM-03', location: 'AREA BORDES - KIRI', url: "https://awsimages.detik.net.id/visual/2022/12/25/kereta-panoramic-kini-bisa-dicoba-oleh-masyarakat-umum-setelah-soft-launching-yang-dilakukan-pt-kereta-api-indonesia-pada-24-d-2_169.jpeg?w=1200" },
        { id: 'CAM-04', location: 'AREA BORDES - KANAN', url: "https://asset.kompas.com/crops/RRMwhqmwIwdwA3xhcoXZY6wdHjE=/0x0:999x666/1200x800/data/photo/2022/07/15/62d0ce5c7389a.jpeg" }
    ];
    const [currentCamIndex, setCurrentCamIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentCamIndex((prev) => (prev + 1) % cameras.length), 5000);
        return () => clearInterval(interval);
    }, [currentCamIndex]);

    useEffect(() => {
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockTimer);
    }, []);

    const handlePrevCam = () => {
        setCurrentCamIndex((prev) => (prev - 1 + cameras.length) % cameras.length);
    };

    const handleNextCam = () => {
        setCurrentCamIndex((prev) => (prev + 1) % cameras.length);
    };

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[3rem] shadow-2xl border border-white/10 bg-black group">
            <AnimatePresence mode="wait">
                <motion.div key={currentCamIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cameras[currentCamIndex].url})` }}>
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                </motion.div>
            </AnimatePresence>
            <motion.div animate={{ y: ["0%", "100%", "0%"] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-white/10 h-px z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-white/90 p-3 rounded-xl shadow-2xl"><img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-6" /></div>
                    <div className="flex flex-col text-white"><span className="text-[10px] font-black opacity-60 leading-none mb-1">Security System</span><span className="text-xl font-black italic tracking-tighter leading-none">CCTV Monitor</span></div>
                </div>
                <div className="bg-black/60 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-end">
                    <div className="text-3xl font-black text-white font-mono tracking-tighter tabular-nums leading-none mb-1">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</div>
                    <div className="text-[10px] font-bold text-white/40">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
            </div>
            <div className="absolute top-1/2 left-8 -translate-y-1/2 z-20"><div className="text-white/20 font-mono text-[80px] font-black leading-none select-none">{cameras[currentCamIndex].id}</div></div>

            {/* Manual Navigation Overlay (appears on hover) */}
            <div className="absolute inset-y-0 left-0 w-32 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={handlePrevCam} className="bg-black/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110">
                    <ChevronLeft size={36} />
                </button>
            </div>
            <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={handleNextCam} className="bg-black/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110">
                    <ChevronRight size={36} />
                </button>
            </div>

            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-20">
                <div className="bg-black/80 backdrop-blur-3xl px-10 py-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center gap-6">
                    <div className="bg-blue-600 p-4 rounded-2xl shadow-lg"><Activity size={24} className="text-white" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-black text-white/40 leading-none mb-2">Current Location</span><span className="text-2xl font-black text-white italic">{cameras[currentCamIndex].location}</span></div>
                </div>
            </div>
            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
        </div>
    );
};

const MonitorGPS = ({ route, data }: { route: any, data: any }) => {
    const [gerbongData, setGerbongData] = useState<any[]>([]);
    const [selectedKereta, setSelectedKereta] = useState<number | null>(null);
    const [trains, setTrains] = useState<any[]>([]);
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Record<number, maplibregl.Marker>>({});

    // Fetch trains list for selector
    useEffect(() => {
        const fetchTrains = async () => {
            try {
                const res = await fetch(`${API_URL}/api/gps/fleet`);
                const d = await res.json();
                if (d.success && d.fleet?.length > 0) {
                    setTrains(d.fleet);
                    if (!selectedKereta) setSelectedKereta(d.fleet[0].kereta_id);
                }
            } catch { }
        };
        fetchTrains();
    }, []);

    // Fetch per-gerbong GPS when selectedKereta changes
    useEffect(() => {
        if (!selectedKereta) return;
        const fetchGerbong = async () => {
            try {
                const res = await fetch(`${API_URL}/api/gps/gerbong/${selectedKereta}`);
                const d = await res.json();
                if (d.success) setGerbongData(d.gerbong);
            } catch { }
        };
        fetchGerbong();
        const interval = setInterval(fetchGerbong, 10000);
        return () => clearInterval(interval);
    }, [selectedKereta]);

    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map ONCE
    useEffect(() => {
        if (!mapContainer.current) return;

        // Free dark tile style (no API key needed)
        const darkStyle: maplibregl.StyleSpecification = {
            version: 8,
            sources: {
                'carto-dark': {
                    type: 'raster',
                    tiles: [
                        'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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
            center: [107.6098, -6.9147],
            zoom: 11,
            pitch: 45,
            attributionControl: false
        });

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            Object.values(markersRef.current).forEach((m: maplibregl.Marker) => m.remove());
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Effect for handling GeoJSON changes
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (!route?.geojson) {
            // Remove existing route-path if geojson is deleted
            const source = map.current.getSource('route-path');
            if (source) {
                // we have to remove layers first before the source
                if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
                if (map.current.getLayer('route-line-glow')) map.current.removeLayer('route-line-glow');
                if (map.current.getLayer('station-points')) map.current.removeLayer('station-points');
                if (map.current.getLayer('route-static-geofencing-outer')) map.current.removeLayer('route-static-geofencing-outer');
                if (map.current.getLayer('route-static-geofencing-inner')) map.current.removeLayer('route-static-geofencing-inner');
                map.current.removeSource('route-path');
            }
            return;
        }

        try {
            let geojson = typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson;

            if (!geojson || (geojson.features && geojson.features.length === 0)) {
                console.warn("[MonitorGPS] GeoJSON is empty for route:", route.name);
                return;
            }

            const existingSource = map.current.getSource('route-path') as maplibregl.GeoJSONSource;

            if (existingSource) {
                existingSource.setData(geojson);
            } else {
                map.current?.addSource('route-path', {
                    type: 'geojson',
                    data: geojson
                });

                map.current?.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route-path',
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 4,
                        'line-opacity': 0.8
                    },
                    filter: ['==', '$type', 'LineString']
                });

                map.current?.addLayer({
                    id: 'route-line-glow',
                    type: 'line',
                    source: 'route-path',
                    paint: {
                        'line-color': '#ee6f1f',
                        'line-width': 2,
                        'line-opacity': 1
                    },
                    filter: ['==', '$type', 'LineString']
                });

                map.current?.addLayer({
                    id: 'station-points',
                    type: 'circle',
                    source: 'route-path',
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#ffffff',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ee6f1f'
                    },
                    filter: ['==', '$type', 'Point']
                });

                // Add static geofencing layers (Polygon features in route geojson)
                map.current?.addLayer({
                    id: 'route-static-geofencing-outer',
                    type: 'fill',
                    source: 'route-path',
                    filter: ['all',
                        ['==', '$type', 'Polygon'],
                        ['==', ['get', 'style'], 'outer']
                    ],
                    layout: {},
                    paint: {
                        'fill-color': '#0080ff',
                        'fill-opacity': 0.15,
                        'fill-outline-color': '#0080ff'
                    }
                });

                map.current?.addLayer({
                    id: 'route-static-geofencing-inner',
                    type: 'fill',
                    source: 'route-path',
                    filter: ['all',
                        ['==', '$type', 'Polygon'],
                        ['==', ['get', 'style'], 'inner']
                    ],
                    layout: {},
                    paint: {
                        'fill-color': '#00ffff',
                        'fill-opacity': 0.25,
                        'fill-outline-color': '#00ffff'
                    }
                });
            }

            // Always ensure geo-fencing source circles are created (handled by other effect)
            if (!map.current.getSource('geofencing-circles')) {
                // Add dynamic geofencing source
                map.current?.addSource('geofencing-circles', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

                map.current?.addLayer({
                    id: 'geofencing-outer',
                    type: 'fill',
                    source: 'geofencing-circles',
                    filter: ['==', 'type', 'outer'],
                    paint: {
                        'fill-color': '#0080ff',
                        'fill-opacity': 0.1,
                        'fill-outline-color': '#0080ff'
                    }
                });

                map.current?.addLayer({
                    id: 'geofencing-inner',
                    type: 'fill',
                    source: 'geofencing-circles',
                    filter: ['==', 'type', 'inner'],
                    paint: {
                        'fill-color': '#00ffff',
                        'fill-opacity': 0.15,
                        'fill-outline-color': '#00ffff'
                    }
                });
            }

            if (!map.current.getSource('active-station-circles')) {
                // Add active station radius source
                map.current?.addSource('active-station-circles', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

                map.current?.addLayer({
                    id: 'active-station-outer',
                    type: 'fill',
                    source: 'active-station-circles',
                    filter: ['==', 'type', 'outer'],
                    paint: {
                        'fill-color': '#ee6f1f',
                        'fill-opacity': 0.1,
                        'fill-outline-color': '#ee6f1f'
                    }
                });

                map.current?.addLayer({
                    id: 'active-station-inner',
                    type: 'fill',
                    source: 'active-station-circles',
                    filter: ['==', 'type', 'inner'],
                    paint: {
                        'fill-color': '#ee6f1f',
                        'fill-opacity': 0.2,
                        'fill-outline-color': '#ee6f1f'
                    }
                });
            }

            // Fit map to route bounds if coordinates exist
            const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);
            const lineStringFeature = features.find((f: any) => f.geometry?.type === 'LineString' || f.type === 'LineString');
            const coordinates = lineStringFeature?.geometry?.coordinates || lineStringFeature?.coordinates;

            if (coordinates && coordinates.length > 0) {
                if (!existingSource) {
                    const bounds = coordinates.reduce((bounds: maplibregl.LngLatBounds, coord: [number, number]) => {
                        return bounds.extend(coord);
                    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
                    map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
                }
            }
        } catch (err) {
            console.error("Failed to render GeoJSON:", err);
        }

    }, [route?.geojson, mapLoaded]);

    // Update markers when gerbong data changes
    useEffect(() => {
        if (!map.current) return;

        // Clean up old markers
        const currentIds = gerbongData.map(g => g.gerbong_id);
        Object.keys(markersRef.current).forEach(id => {
            const numId = parseInt(id);
            if (!currentIds.includes(numId)) {
                markersRef.current[numId].remove();
                delete markersRef.current[numId];
            }
        });

        // Add or update markers
        gerbongData.forEach(g => {
            if (g.longitude && g.latitude) {
                if (!markersRef.current[g.gerbong_id]) {
                    const el = document.createElement('div');
                    el.className = 'w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(238,111,31,0.8)] flex items-center justify-center';
                    el.title = g.nama_gerbong;

                    markersRef.current[g.gerbong_id] = new maplibregl.Marker({ element: el })
                        .setLngLat([g.longitude, g.latitude])
                        .addTo(map.current!);
                } else {
                    markersRef.current[g.gerbong_id].setLngLat([g.longitude, g.latitude]);
                }
            }
        });

    }, [gerbongData]);

    // Update geofencing circles based on first gerbong position
    useEffect(() => {
        if (!map.current || gerbongData.length === 0) return;

        const firstGerbong = gerbongData[0];
        if (!firstGerbong.longitude || !firstGerbong.latitude) return;

        const center = [firstGerbong.longitude, firstGerbong.latitude];
        const innerRadius = (data.geofencingInnerRadius || 250) / 1000; // in km
        const outerRadius = (data.geofencingOuterRadius || 750) / 1000; // in km

        try {
            const innerCircle = turf.circle(center, innerRadius, { steps: 64, units: 'kilometers', properties: { type: 'inner' } });
            const outerCircle = turf.circle(center, outerRadius, { steps: 64, units: 'kilometers', properties: { type: 'outer' } });

            const source = map.current.getSource('geofencing-circles') as maplibregl.GeoJSONSource;
            if (source) {
                source.setData({
                    type: 'FeatureCollection',
                    features: [outerCircle, innerCircle]
                });
            }
        } catch (err) {
            console.error("Failed to update geofencing circles:", err);
        }
    }, [gerbongData, data.geofencingInnerRadius, data.geofencingOuterRadius]);

    // Update active station highlight circles
    useEffect(() => {
        if (!map.current || !route?.geojson || data.currentStation === '-') {
            const source = map.current?.getSource('active-station-circles') as maplibregl.GeoJSONSource;
            if (source) source.setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        try {
            const geojson = typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson;
            const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);

            // Find current station point in GeoJSON (case-insensitive and trimmed)
            const currentStationClean = (data.currentStation || '').trim().toLowerCase();
            const stationFeature = features.find((f: any) => {
                if (f.geometry?.type !== 'Point') return false;
                const propName = (f.properties?.name || '').trim().toLowerCase();
                const propStationName = (f.properties?.station_name || '').trim().toLowerCase();
                return propName === currentStationClean || propStationName === currentStationClean;
            });

            if (stationFeature) {
                const center = stationFeature.geometry.coordinates;
                const innerRadius = (data.geofencingInnerRadius || 250) / 1000;
                const outerRadius = (data.geofencingOuterRadius || 750) / 1000;

                const innerCircle = turf.circle(center, innerRadius, { steps: 64, units: 'kilometers', properties: { type: 'inner' } });
                const outerCircle = turf.circle(center, outerRadius, { steps: 64, units: 'kilometers', properties: { type: 'outer' } });

                const source = map.current.getSource('active-station-circles') as maplibregl.GeoJSONSource;
                if (source) {
                    source.setData({
                        type: 'FeatureCollection',
                        features: [outerCircle, innerCircle]
                    });
                }
            } else {
                // Clear circles if station not found
                const source = map.current.getSource('active-station-circles') as maplibregl.GeoJSONSource;
                if (source) source.setData({ type: 'FeatureCollection', features: [] });
            }
        } catch (err) {
            console.error("Failed to update station highlight circles:", err);
        }
    }, [route?.geojson, data.currentStation, data.geofencingInnerRadius, data.geofencingOuterRadius]);


    return (
        <div className="space-y-6 h-full flex flex-col">

            {/* Map Area */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex-1 min-h-[400px] relative flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0 px-4">
                    <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight flex items-center gap-3">
                        <MapPin className="text-[#ee6f1f]" /> Peta Lokasi Armada
                    </h2>
                    <select
                        value={selectedKereta || ''}
                        onChange={e => setSelectedKereta(parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-sm font-bold text-[#1d2d6a] focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all"
                    >
                        {trains.map(t => <option key={t.kereta_id} value={t.kereta_id}>{t.kereta_name} ({t.ka_number})</option>)}
                    </select>
                </div>

                <div className="relative flex-1 w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-[#0a0f1e]">
                    <div ref={mapContainer} className="absolute inset-0" />

                    {!route?.geojson && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                            <MapPin size={48} className="text-white/30 mb-4" />
                            <span className="text-white font-bold text-xl mb-1 drop-shadow-md">Peta Belum Dikonfigurasi</span>
                            <span className="text-white/70 text-sm font-medium drop-shadow-md">Sistem PIDS belum memiliki data GeoJSON.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Per-Gerbong GPS Tracking Panel */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight flex items-center gap-3">
                        <MapPin className="text-[#ee6f1f]" />Detail State per Gerbong
                    </h2>
                </div>
                {gerbongData.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-medium">Tidak ada data gerbong</div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {gerbongData.map((g, i) => (
                            <motion.div key={g.gerbong_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${g.sensor_status === 'Aktif' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-[#1d2d6a] font-black text-sm flex-1">{g.nama_gerbong}</span>
                                    <span className="text-slate-400 text-[10px] font-bold">#{String(g.no_urut_gerbong).padStart(2, '0')}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Koordinat</span><span className="text-slate-500 font-mono text-[10px]">{g.latitude?.toFixed(4) || '-'}, {g.longitude?.toFixed(4) || '-'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Altitude</span><span className="text-slate-600 font-mono">{g.altitude?.toFixed(1) || '-'} m</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Kecepatan</span><span className="text-[#ee6f1f] font-black">{g.kecepatan?.toFixed(1) || '0'} km/h</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Suhu</span><span className="text-slate-600 font-medium">{g.suhu?.toFixed(1) || '-'}°C</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">POI</span><span className="text-slate-500 font-medium truncate max-w-[120px]">{g.poi || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-bold">Sensor</span>
                                        <span className={`text-[10px] font-black ${g.sensor_status === 'Aktif' ? 'text-green-500' : 'text-red-400'}`}>{g.sensor_status}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Log Viewer Component ---
const LogViewer = ({ token }: { token: string }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const ACTION_LABELS: Record<string, { label: string; color: string }> = {
        LOGIN: { label: 'Login', color: 'text-green-600 bg-green-50 border-green-100' },
        LOGIN_FAILED: { label: 'Login Gagal', color: 'text-red-600 bg-red-50 border-red-100' },
        LOGOUT: { label: 'Logout', color: 'text-slate-600 bg-slate-50 border-slate-200' },
        STATE_UPDATE: { label: 'Update State', color: 'text-blue-600 bg-blue-50 border-blue-100' },
        DISPLAY_MODE: { label: 'Mode Display', color: 'text-purple-600 bg-purple-50 border-purple-100' },
        LED_CONFIG: { label: 'LED Config', color: 'text-orange-600 bg-orange-50 border-orange-100' },
        ADMIN_CRUD: { label: 'Admin CRUD', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
        SYSTEM: { label: 'Sistem', color: 'text-slate-500 bg-slate-50 border-slate-200' },
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/logs`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setLogs(data.logs);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const filtered = filter === 'ALL' ? logs : logs.filter(l => l.action === filter);
    const filterOptions = ['ALL', 'LOGIN', 'LOGIN_FAILED', 'STATE_UPDATE', 'LED_CONFIG', 'ADMIN_CRUD', 'SYSTEM'];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight flex items-center gap-3">
                        <ScrollText className="text-[#ee6f1f]" />Log Aktivitas Sistem
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map(opt => (
                            <button key={opt} onClick={() => setFilter(opt)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${filter === opt ? 'bg-[#1d2d6a] text-white border-[#1d2d6a]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                {opt === 'ALL' ? 'Semua' : ACTION_LABELS[opt]?.label || opt}
                            </button>
                        ))}
                    </div>
                </div>
                {loading ? (
                    <div className="text-center py-16 text-slate-400 font-medium">Memuat log...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 font-medium">Belum ada log yang tercatat.</div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[#1d2d6a] font-black text-[11px]">
                                <tr>
                                    <th className="p-4 border-b border-slate-200">Waktu</th>
                                    <th className="p-4 border-b border-slate-200">Aksi</th>
                                    <th className="p-4 border-b border-slate-200">Pengguna</th>
                                    <th className="p-4 border-b border-slate-200">Role</th>
                                    <th className="p-4 border-b border-slate-200">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.slice(0, 100).map(log => {
                                    const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'text-slate-600 bg-slate-50 border-slate-200' };
                                    const dt = new Date(log.timestamp);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                                <div>{dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                <div className="font-bold text-slate-700">{dt.toLocaleTimeString('id-ID', { hour12: false })}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black border ${meta.color}`}>{meta.label}</span>
                                            </td>
                                            <td className="p-4 font-bold text-[#1d2d6a]">{log.user}</td>
                                            <td className="p-4 text-slate-500 text-xs font-medium">{log.role}</td>
                                            <td className="p-4 text-slate-600 text-xs">{log.details}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length > 100 && <div className="p-4 text-center text-slate-400 text-xs font-medium border-t border-slate-100">Menampilkan 100 dari {filtered.length} entri log. Gunakan Command Center untuk melihat semua.</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

function App() {
    const [activeTab, setActiveTab] = useState('pids');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [authToken, setAuthToken] = useState<string>('');

    const { data, sendData } = usePidsData();
    const activeTrainName = data.serviceName || 'Belum Dikonfigurasi';
    const activeTrainNumber = data.trainNumber || '-';
    const activeRoute = data.activeRoute || {
        name: data.serviceName || '-',
        stations: data.stations || [],
        path: '',
        nodes: [],
    };

    // Check persisted session on mount
    useEffect(() => {
        const token = sessionStorage.getItem('pids_token');
        const userStr = sessionStorage.getItem('pids_user');
        if (token && userStr) {
            try {
                // Verify token with server
                fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(d => {
                        if (d.success) {
                            setAuthToken(token);
                            setAuthUser(JSON.parse(userStr));
                        } else {
                            sessionStorage.removeItem('pids_token');
                            sessionStorage.removeItem('pids_user');
                        }
                    }).catch(() => {
                        // Server not yet up, trust local session
                        setAuthToken(token);
                        setAuthUser(JSON.parse(userStr));
                    });
            } catch { }
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);


    const handleLogin = (user: AuthUser, token: string) => {
        setAuthUser(user);
        setAuthToken(token);
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
        } catch { }
        sessionStorage.removeItem('pids_token');
        sessionStorage.removeItem('pids_user');
        setAuthUser(null);
        setAuthToken('');
        setActiveTab('pids');
    };

    // Auth guard
    if (!authUser) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    const NAV_ITEMS = [
        { id: 'pids', icon: LayoutDashboard, label: 'PIDS' },
        { id: 'stampformasi', icon: Database, label: 'STAMPFORMASI' },
        { id: 'tv', icon: Video, label: 'CCTV' },
        { id: 'gps', icon: MapPin, label: 'GPS MAP' },
        { id: 'logs', icon: ScrollText, label: 'Log Aktivitas' },
    ];

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 bg-[#1d2d6a] flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] z-20">
                <div className="p-10 pb-6">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                        alt="KAI Logo"
                        className="h-12 w-auto mb-6 brightness-0 invert"
                    />
                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight">PIDS Master</h1>
                    <p className="text-[15px] font-bold text-blue-200/40 mt-1">Kereta Makan</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <ul className="space-y-2">
                        {NAV_ITEMS.map((item) => (
                            <li key={item.id}>
                                <button onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl transition-all duration-300 font-bold text-lg ${activeTab === item.id ? 'bg-[#ee6f1f] text-white shadow-[0_12px_24px_rgba(238,111,31,0.3)] scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={28} strokeWidth={2.5} />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-6 space-y-3 mt-auto border-t border-white/5 bg-black/5">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] border border-white/5 active:scale-95 group">
                        <LogOut size={16} className="text-white/20 group-hover:text-red-400 transition-colors" />
                        <span>Logout dari Sistem</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10 shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-sm">
                            {(() => {
                                const Icon = NAV_ITEMS.find(n => n.id === activeTab)?.icon || Train;
                                return <Icon className="text-[#1d2d6a]" size={22} strokeWidth={2.5} />;
                            })()}
                        </div>
                        <div>
                            <span className="text-xl font-black text-[#1d2d6a] uppercase tracking-normal">
                                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        {/* Active Unit Badge Style */}
                        <div className="flex items-center gap-4 border-r border-slate-100 pr-10">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Active Unit</div>
                                <div className="text-base font-black text-[#1d2d6a] tracking-tight">
                                    {activeTrainName} <span className="text-[#ee6f1f] ml-1.5 px-2 py-0.5 bg-orange-50 rounded font-mono text-xs border border-orange-100">K1-90-{activeTrainNumber}</span>
                                </div>
                            </div>
                        </div>

                        {/* Clock Style */}
                        <div className="flex items-center gap-3 text-[#1d2d6a]">
                            <div className="bg-slate-50 p-2 rounded-xl text-slate-400 border border-slate-100">
                                <Clock size={18} />
                            </div>
                            <span className="text-3xl font-black font-mono tracking-tighter opacity-90">
                                {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-10 bg-[#f8fafc]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'pids' ? (
                            <motion.div key="pids" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="max-w-7xl mx-auto">
                                <MasterConsolePanel route={activeRoute} data={data} sendData={sendData} />
                            </motion.div>
                        ) : activeTab === 'stampformasi' ? (
                            <motion.div key="stampformasi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="max-w-6xl mx-auto space-y-10">
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                                    <h2 className="text-xl font-black text-[#1d2d6a] mb-8 tracking-tight flex items-center gap-3">
                                        <Database className="text-[#ee6f1f]" />Stampformasi
                                    </h2>
                                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-[#1d2d6a] font-black">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200">No Rangkaian</th>
                                                    <th className="p-4 border-b border-slate-200">No Aset</th>
                                                    <th className="p-4 border-b border-slate-200">Nama Layanan (Service)</th>
                                                    <th className="p-4 border-b border-slate-200">IP Address</th>
                                                    <th className="p-4 border-b border-slate-200">Last Report</th>
                                                    <th className="p-4 border-b border-slate-200 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Array.from({ length: data.jumlahKereta || 10 }).map((_, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-bold text-slate-700">K1-{String(idx + 1).padStart(2, '0')}</td>
                                                        <td className="p-4 font-mono text-slate-500">K1{String(idx + 1).padStart(2, '0')}{String(800 + idx)}</td>
                                                        <td className="p-4 font-bold text-[#1d2d6a]">{activeTrainName}</td>
                                                        <td className="p-4 font-mono text-slate-500">192.168.1.{100 + idx}</td>
                                                        <td className="p-4 font-mono text-slate-500">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black border border-green-100">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                                Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        ) : activeTab === 'tv' ? (
                            <motion.div key="tv" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="h-full w-full max-w-6xl mx-auto">
                                <MonitorCCTV data={data} />
                            </motion.div>
                        ) : activeTab === 'gps' ? (
                            <motion.div key="gps" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="h-full w-full max-w-6xl mx-auto">
                                <MonitorGPS route={activeRoute} data={data} />
                            </motion.div>
                        ) : activeTab === 'logs' ? (
                            <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                <LogViewer token={authToken} />
                            </motion.div>
                        ) : (
                            <motion.div key="under-construction" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-slate-400 gap-6">
                                <div className="bg-white p-12 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center gap-6 border border-slate-100 max-w-md w-full">
                                    <div className="bg-orange-50 p-6 rounded-3xl text-[#ee6f1f]"><AlertCircle size={48} /></div>
                                    <div className="text-center">
                                        <h2 className="text-xl font-black text-[#1d2d6a] mb-2 tracking-tight">Access Restricted</h2>
                                        <p className="text-sm font-medium text-slate-400 leading-relaxed">Module <span className="text-[#1d2d6a]">{activeTab}</span> sedang dalam pemeliharaan.</p>
                                    </div>
                                    <button onClick={() => setActiveTab('pids')} className="w-full mt-4 px-8 py-4 bg-slate-900 hover:bg-black text-white text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95">Return to Dashboard</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

export default App;
