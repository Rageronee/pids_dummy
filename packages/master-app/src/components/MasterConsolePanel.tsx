import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Train, Settings, Save, RefreshCw, Volume2,
    MapPin, MonitorPlay, Mic, Play, Pause,
    ChevronDown, ChevronRight, RadioTower, Video, Info,
    ListVideo, AlertCircle, Satellite,
    Repeat, Shuffle, Plus, FolderOpen,
    Upload, Trash2, Loader2, Maximize, VolumeX, X
} from 'lucide-react';
function StateToggle({ value, label1 = "auto", label2 = "custom", onChange }: { value: string, label1?: string, label2?: string, onChange?: (val: string) => void }) {
    const [internalValue, setInternalValue] = useState(value.toLowerCase());
    const isFirst = internalValue === label1.toLowerCase();
    return (
        <button
            type="button"
            onClick={() => {
                const navVal = isFirst ? label2.toLowerCase() : label1.toLowerCase();
                setInternalValue(navVal);
                onChange?.(navVal);
            }}
            className={`px-3 py-1 text-[8px] font-black rounded-lg transition-all border shadow-sm ${isFirst
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                : 'bg-[#ee6f1f] text-white border-[#d8631c] hover:bg-[#f87a2c]'
                }`}
        >
            {internalValue.charAt(0).toUpperCase() + internalValue.slice(1).toLowerCase()}
        </button>
    );
}

// Text-Only Toggle for Carriages
function TextToggle({ value, label1 = "auto", label2 = "custom" }: { value: string, label1?: string, label2?: string }) {
    const [internalValue, setInternalValue] = useState(value.toLowerCase());
    const isFirst = internalValue === label1.toLowerCase();
    return (
        <button
            type="button"
            onClick={() => setInternalValue(isFirst ? label2.toLowerCase() : label1.toLowerCase())}
            className={`text-[9px] font-black transition-colors ${isFirst ? 'text-blue-500 hover:text-blue-600' : 'text-[#ee6f1f] hover:text-[#d8631c]'}`}
        >
            {internalValue.charAt(0).toUpperCase() + internalValue.slice(1).toLowerCase()}
        </button>
    );
}

// Reusable Accordion Component
function SectionAccordion({
    title, icon: Icon, defaultOpen = false, children, summary
}: {
    title: string; icon: any; defaultOpen?: boolean; children: React.ReactNode; summary?: React.ReactNode
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-slate-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-6 py-5 lg:px-8 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className="text-[#ee6f1f]">
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm lg:text-base font-black text-[#1d2d6a]">{title}</span>
                        {!isOpen && summary && (
                            <div className="text-xs font-bold text-slate-400 mt-1 hidden sm:block">{summary}</div>
                        )}
                    </div>
                </div>
                <div className={`p-2 rounded-full transition-transform duration-300 ${isOpen ? 'bg-slate-100 rotate-180' : 'bg-transparent rotate-0'}`}>
                    <ChevronDown size={20} className="text-slate-400" />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2 lg:px-8 lg:pb-8 border-t border-slate-100 bg-slate-50/50">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


export function MasterConsolePanel({ route, data, sendData }: { route: any, data: any, sendData: (updates: any) => Promise<void> }) {

    const activeTrainName = data?.serviceName || 'Belum Dikonfigurasi';
    const activeTrainNumber = data?.trainNumber || '-';
    const [jumlahKereta, setJumlahKereta] = useState(5);
    const [gerbongCounts, setGerbongCounts] = useState<Record<string, number>>({});
    const [mediaSource, setMediaSource] = useState('Line In');
    const [outerRadius, setOuterRadius] = useState(data?.geofencingOuterRadius || 750);
    const [innerRadius, setInnerRadius] = useState(data?.geofencingInnerRadius || 250);
    const radiusRef = useRef({ inner: data?.geofencingInnerRadius || 250, outer: data?.geofencingOuterRadius || 750 });
    const [toast, setToast] = useState<{ msg: string; ok: boolean; id?: number } | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [stationsData, setStationsData] = useState<any[]>([]);
    const [scheduleData, setScheduleData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [videoList, setVideoList] = useState<string[]>([]);
    const [videoViewMode, setVideoViewMode] = useState<'playlist' | 'files'>('playlist');
    const [showStandbyConfirm, setShowStandbyConfirm] = useState(false);
    const [showClearPlaylistConfirm, setShowClearPlaylistConfirm] = useState(false);
    const [loadingVideos, setLoadingVideos] = useState(false);

    // Fetch videos from server
    const fetchVideos = useCallback(async () => {
        try {
            setLoadingVideos(true);
            const res = await fetch('http://localhost:3001/api/media/videos');
            const d = await res.json();
            if (d.success) setVideoList(d.videos);
        } catch (e) {
            console.error("Failed to fetch videos:", e);
        } finally {
            setLoadingVideos(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);
    const [simGps, setSimGps] = useState({ lng: 0, lat: 0, heading: 0 });
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const simGpsRef = useRef(simGps);
    const navTableRef = useRef<HTMLDivElement>(null);
    const lastFocusedStation = useRef<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // VIDEO HANDLERS & LOGIC
    const playlist = data?.videoPlaylist || [];
    const activeIndex = data?.activeVideoIndex ?? 0;
    const isPlaying = data?.isPlaying ?? false;
    const playbackMode = data?.playbackMode || 'normal';
    const activeFile = playlist[activeIndex];

    const lastProgressSync = useRef(0);
    const lastVolumeRef = useRef(data?.volume || 50);

    const toggleMute = () => {
        if ((data?.volume || 0) > 0) {
            lastVolumeRef.current = data?.volume || 50;
            handleVideoAction({ volume: 0 });
        } else {
            handleVideoAction({ volume: lastVolumeRef.current || 50 });
        }
    };

    const handleVideoAction = useCallback(async (updates: any) => {
        await sendData(updates);
    }, [sendData]);

    const addToPlaylist = (file: string) => {
        const newPlaylist = [...playlist, file];
        handleVideoAction({ videoPlaylist: newPlaylist });
        showToast(`"${file}" ditambahkan ke playlist`);
    };

    const removeFromPlaylist = (idx: number) => {
        const newPlaylist = playlist.filter((_: any, i: number) => i !== idx);
        let newIndex = activeIndex;
        if (activeIndex >= newPlaylist.length && newPlaylist.length > 0) newIndex = newPlaylist.length - 1;
        handleVideoAction({ videoPlaylist: newPlaylist, activeVideoIndex: newIndex, playbackProgress: 0 });
    };

    const playVideoAt = (idx: number) => {
        handleVideoAction({ activeVideoIndex: idx, isPlaying: false, playbackProgress: 0 });
    };

    const togglePlay = () => {
        if (playlist.length === 0) return showToast('Playlist kosong');
        handleVideoAction({ isPlaying: !isPlaying });
        showToast(isPlaying ? 'Video dijeda' : 'Memutar video');
    };

    const nextVideo = () => {
        if (playlist.length === 0) return;

        // Kembali ke mode standby jika di akhir playlist dan mode normal (non repeat)
        if (playbackMode === 'normal' && activeIndex === playlist.length - 1) {
            handleVideoAction({
                activeVideoIndex: 0,
                isPlaying: false,
                playbackProgress: 0,
                tvStandby: true
            });
            return;
        }

        const nextIdx = (activeIndex + 1) % playlist.length;
        handleVideoAction({ activeVideoIndex: nextIdx, isPlaying: isPlaying, playbackProgress: 0 });
    };

    const prevVideo = () => {
        if (playlist.length === 0) return;
        const prevIdx = (activeIndex - 1 + playlist.length) % playlist.length;
        handleVideoAction({ activeVideoIndex: prevIdx, isPlaying: isPlaying, playbackProgress: 0 });
    };

    const toggleRepeat = () => {
        const repeatModes = ['normal', 'repeat-one', 'repeat-all'];
        const currentMode = playbackMode === 'shuffle' ? 'normal' : playbackMode;
        const nextMode = repeatModes[(repeatModes.indexOf(currentMode) + 1) % repeatModes.length];
        handleVideoAction({ playbackMode: nextMode });
        showToast(`Repeat: ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1).toLowerCase()}`);
    };

    const toggleShuffle = () => {
        const isShuffle = playbackMode === 'shuffle';
        handleVideoAction({ playbackMode: isShuffle ? 'normal' : 'shuffle' });
        showToast(isShuffle ? 'Urutan normal' : 'Mode acak diaktifkan');
    };

    const handleSelectDirectory = async () => {
        try {
            // @ts-ignore
            const selectedDir = await window.require('electron').ipcRenderer.invoke('select-directory');
            if (selectedDir) {
                const res = await fetch('http://localhost:3001/api/media/directory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directory: selectedDir })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(`Direktori diubah ke: ${selectedDir}`);
                    fetchVideos();
                    setVideoViewMode('files');
                }
            }
        } catch (e) {
            console.error("Failed to select directory:", e);
            showToast('Gagal membuka browser direktori');
        }
    };

    // Video effect for sync state
    useEffect(() => {
        if (!videoRef.current) return;
        const vid = videoRef.current;
        vid.volume = (data?.volume ?? 50) / 100;

        if (data?.isPlaying) {
            if (vid.paused) vid.play().catch(e => console.error("Play failed:", e));
        } else {
            if (!vid.paused) vid.pause();
        }
    }, [data?.isPlaying, data?.volume]);

    useEffect(() => {
        if (!videoRef.current || isNaN(videoRef.current.duration)) return;
        const vid = videoRef.current;
        const targetTime = ((data?.playbackProgress || 0) / 100) * (vid.duration || 1);
        if (Math.abs(vid.currentTime - targetTime) > 2) {
            vid.currentTime = targetTime;
        }
    }, [data?.playbackProgress]);

    // Auto-scroll to current station in table
    useEffect(() => {
        if (!navTableRef.current || !data?.currentStation || data.currentStation === '-') return;

        // Only focus if station actually changed from last focused one
        if (data.currentStation === lastFocusedStation.current) return;

        const timeoutId = setTimeout(() => {
            const container = navTableRef.current;
            const activeRow = container?.querySelector('[data-active="true"]');

            if (activeRow && container) {
                const row = activeRow as HTMLElement;
                row.scrollIntoView({ behavior: 'smooth', block: 'start' });
                lastFocusedStation.current = data.currentStation;
            }
        }, 150);

        return () => clearTimeout(timeoutId);
    }, [data?.currentStation, route?.geojson]);

    // Fetch stations
    useEffect(() => {
        fetch('http://localhost:3001/api/stations')
            .then(res => res.json())
            .then(res => {
                if (res.success && res.stations) {
                    setStationsData(res.stations);
                }
            })
            .catch(console.error);
    }, []);

    // Fetch schedules for the active service
    useEffect(() => {
        fetch('http://localhost:3001/api/schedules')
            .then(res => res.json())
            .then(res => {
                if (res.success && res.schedules) {
                    setScheduleData(res.schedules);
                }
            })
            .catch(console.error);
    }, [activeTrainName]);

    // Fetch gerbong counts from db
    useEffect(() => {
        fetch('http://localhost:3001/api/db')
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data?.gerbongCounts) {
                    setGerbongCounts(res.data.gerbongCounts);
                }
            })
            .catch(console.error);
    }, []);

    // Update jumlah kereta when activeTrainName or gerbongCounts changes
    useEffect(() => {
        if (activeTrainName && gerbongCounts[activeTrainName]) {
            setJumlahKereta(gerbongCounts[activeTrainName]);
        }
    }, [activeTrainName, gerbongCounts]);

    // Sync geofencing radius from data prop
    useEffect(() => {
        if (data?.geofencingInnerRadius !== undefined) setInnerRadius(data.geofencingInnerRadius);
        if (data?.geofencingOuterRadius !== undefined) setOuterRadius(data.geofencingOuterRadius);
    }, [data?.geofencingInnerRadius, data?.geofencingOuterRadius]);

    // Keep radiusRef in sync to avoid stale closures in requestAnimationFrame
    useEffect(() => {
        radiusRef.current = { inner: innerRadius, outer: outerRadius };
    }, [innerRadius, outerRadius]);

    const sendGeofencingUpdate = async () => {
        await sendData({
            geofencingInnerRadius: innerRadius,
            geofencingOuterRadius: outerRadius
        });
        showToast('Radius geofencing berhasil diperbarui.');
    };

    // Sync GPS coordinates perfectly, preventing random jitter. Coordinates act as primary anchor.
    useEffect(() => {
        if (!stationsData.length || !data?.currentStation) return;
        const currentStn = stationsData.find(s => s.name === data.currentStation);
        if (currentStn) {
            const newGps = {
                lng: currentStn.longitude,
                lat: currentStn.latitude,
                heading: data.heading || 0
            };
            setSimGps(newGps);
            simGpsRef.current = newGps;
        }
    }, [stationsData, data?.currentStation]);

    // Update map marker and geofencing circles whenever telemetry aligns with the selector.
    useEffect(() => {
        if (!map.current || !markerRef.current) return;

        const lng = simGps.lng === 0 ? 107.6036 : simGps.lng;
        const lat = simGps.lat === 0 ? -6.9125 : simGps.lat;

        // Update Marker Exact Location
        markerRef.current.setLngLat([lng, lat]);

        // Smoothly move map to the new location
        if (simGps.lng !== 0 && simGps.lat !== 0) {
            map.current.easeTo({
                center: [lng, lat],
                zoom: 15,
                duration: 1000
            });
        }

        // No geofencing circles update in PIDS tab
    }, [simGps]);

    // Update active station highlight circles
    useEffect(() => {
        if (!map.current || !route?.geojson || data?.currentStation === '-') {
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
                const innerRad = (innerRadius || 250) / 1000;
                const outerRad = (outerRadius || 750) / 1000;

                const innerCircle = turf.circle(center, innerRad, { steps: 64, units: 'kilometers', properties: { type: 'inner' } });
                const outerCircle = turf.circle(center, outerRad, { steps: 64, units: 'kilometers', properties: { type: 'outer' } });

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
    }, [route?.geojson, data?.currentStation, innerRadius, outerRadius]);

    const activeRouteStations = data?.activeRoute?.stations || data?.stations || [];

    // Derived: relasi (first station code - last station code)
    const firstStation = activeRouteStations[0] || '-';
    const lastStation = activeRouteStations[activeRouteStations.length - 1] || '-';
    const firstStationObj = stationsData.find(s => s.name === firstStation);
    const lastStationObj = stationsData.find(s => s.name === lastStation);
    const relasiCode = `${firstStationObj?.id || firstStation.substring(0, 3)} - ${lastStationObj?.id || lastStation.substring(0, 3)}`;

    // Derived: schedule for the active service
    const activeSchedule = scheduleData.find(s => s.train_name === activeTrainName);
    const firstStop = activeSchedule?.stops?.[0];
    const lastStop = activeSchedule?.stops?.[activeSchedule.stops.length - 1];
    const departureTime = firstStop?.departure_time || '-';
    const arrivalTime = lastStop?.arrival_time || '-';
    const departureLabel = `${firstStationObj?.id || firstStation.substring(0, 3)} ${departureTime}`;
    const arrivalLabel = `${lastStationObj?.id || lastStation.substring(0, 3)} ${arrivalTime}`;

    const nextStationName = data?.nextStation || (activeRouteStations.length > 1 ? activeRouteStations[1] : '-');

    // Derived: nearest POI = nextStation
    const nearestPoi = nextStationName;

    // Derived: ETA to next station from schedule
    const nextStopSchedule = activeSchedule?.stops?.find((s: any) => s.station_name === nextStationName);
    const etaTime = nextStopSchedule?.arrival_time || '-';

    // Derived: distance to nearest POI (approximate)
    const currentStnObj = stationsData.find(s => s.name === data?.currentStation);
    const nextStnObj = stationsData.find(s => s.name === nextStationName);
    let distToNext = '-';
    if (currentStnObj && nextStnObj) {
        const R = 6371;
        const dLat = (nextStnObj.latitude - currentStnObj.latitude) * Math.PI / 180;
        const dLon = (nextStnObj.longitude - currentStnObj.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(currentStnObj.latitude * Math.PI / 180) * Math.cos(nextStnObj.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        distToNext = d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
    }

    let navData = [];
    if (route?.geojson && route.geojson !== '{}') {
        try {
            const geojson = typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson;
            const features = geojson.features || (geojson.type === 'FeatureCollection' ? geojson.features : [geojson]);
            const pts = features?.filter((f: any) => f.geometry?.type === 'Point' && f.properties?.name) || [];

            if (pts.length > 0) {
                navData = pts.map((f: any, idx: number) => {
                    const sName = (f.properties?.name || '').toUpperCase();
                    // Optional: Try to find schedule from DB by name
                    const stopSched = activeSchedule?.stops?.find((s: any) => (s.station_name || '').toUpperCase() === sName);

                    const isBerhenti = sName === (data?.currentStation || '').trim().toUpperCase();
                    const lng = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates[0]?.toFixed(6) : "-";
                    const lat = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates[1]?.toFixed(6) : "-";

                    return {
                        name: f.properties?.name || sName,
                        type: idx === 0 ? 'ASAL' : idx === pts.length - 1 ? 'TUJUAN' : 'ANTARA',
                        lng: lng,
                        lat: lat,
                        eta: stopSched?.arrival_time || stopSched?.departure_time || "-",
                        status: isBerhenti ? "BERHENTI" : "",
                        next: pts[idx + 1]?.properties?.name || "-"
                    };
                });
            }
        } catch (e) {
            console.error("Failed to parse GeoJSON for navData:", e);
        }
    }

    // Fallback logic if GeoJSON not available or has no point features
    if (navData.length === 0) {
        navData = activeRouteStations.map((stationName: string, idx: number) => {
            const station = stationsData.find(s => s.name === stationName) || {};
            const stopSched = activeSchedule?.stops?.find((s: any) => s.station_name === stationName);
            return {
                name: stationName,
                type: idx === 0 ? 'ASAL' : idx === activeRouteStations.length - 1 ? 'TUJUAN' : 'ANTARA',
                lng: station.longitude?.toFixed(6) || "-",
                lat: station.latitude?.toFixed(6) || "-",
                eta: stopSched?.arrival_time || stopSched?.departure_time || "-",
                status: stationName === data?.currentStation ? "BERHENTI" : "",
                next: activeRouteStations[idx + 1] || "-"
            };
        });
    }

    const showToast = (msg: string, ok: boolean = true) => {
        setToast({ msg, ok, id: Date.now() });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
    };

    const handleDeleteClick = () => {
        if (!route?.name) return;
        setShowDeleteModal(true);
    };

    const confirmDeleteGeoJSON = async () => {
        setShowDeleteModal(false);
        try {
            setUploading(true);
            const token = sessionStorage.getItem('pids_token');
            const res = await fetch(`http://localhost:3001/api/admin/routes/${encodeURIComponent(route.name)}/geojson`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                await new Promise(r => setTimeout(r, 1500));
                showToast('GeoJSON rute berhasil dihapus.');
            } else {
                let msg = 'Gagal menghapus GeoJSON';
                try {
                    const err = await res.json();
                    msg = err.error || err.message || msg;
                } catch (e) { }
                showToast(msg, false);
            }
        } catch (e) {
            console.error('[GeoJSON Delete] Error:', e);
            showToast('Kesalahan koneksi saat menghapus GeoJSON. Pastikan server aktif.', false);
        } finally {
            setUploading(false);
        }
    };

    const handleUploadGeoJSON = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                setUploading(true);
                const jsonStr = event.target?.result as string;
                let parsed;
                try {
                    parsed = JSON.parse(jsonStr);
                } catch (e) {
                    throw new Error('File bukan format JSON/GeoJSON yang valid.');
                }

                // Validate basic GeoJSON structure
                if (!parsed.type || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature' && !parsed.coordinates)) {
                    throw new Error('File bukan GeoJSON yang valid. Pastikan file memiliki "type": "FeatureCollection" atau "Feature".');
                }

                if (!route?.name) {
                    showToast('Tidak ada rute kereta yang aktif. Pilih rute terlebih dahulu.', false);
                    setUploading(false);
                    return;
                }

                const token = sessionStorage.getItem('pids_token');
                if (!token) {
                    showToast('Sesi login tidak ditemukan. Silakan login ulang.', false);
                    setUploading(false);
                    return;
                }

                console.log(`[GeoJSON Upload] Uploading to route: ${route.name}, file size: ${jsonStr.length} chars`);

                let res: Response;
                try {
                    res = await fetch(`http://localhost:3001/api/admin/routes/${encodeURIComponent(route.name)}/geojson`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            geojson: parsed,
                            filename: file.name
                        })
                    });
                } catch (networkErr) {
                    throw new Error('Tidak dapat terhubung ke API server (port 3001). Pastikan Electron sudah berjalan.');
                }

                // Check HTTP status before parsing JSON
                if (!res.ok) {
                    // Try to get error message from response
                    let errMsg = `Server error (HTTP ${res.status})`;
                    try {
                        const errBody = await res.json();
                        errMsg = errBody.error || errBody.message || errMsg;
                    } catch {
                        // Response is not JSON (e.g. HTML error page)
                        if (res.status === 413) {
                            errMsg = 'File GeoJSON terlalu besar. Coba kurangi ukuran file.';
                        } else if (res.status === 401) {
                            errMsg = 'Sesi login expired. Silakan login ulang.';
                        } else if (res.status === 404) {
                            errMsg = `Rute "${route.name}" tidak ditemukan di database.`;
                        }
                    }
                    throw new Error(errMsg);
                }

                const apiData = await res.json();
                if (apiData.success) {
                    await new Promise(r => setTimeout(r, 1500));
                    showToast('GeoJSON rute berhasil diunggah! Data stasiun otomatis diperbarui.');
                    if (e.target) e.target.value = ''; // Reset input
                } else {
                    showToast(`Gagal: ${apiData.error}`, false);
                }
            } catch (err: any) {
                console.error('[GeoJSON Upload] Error:', err);
                showToast(err.message || 'Format file GeoJSON tidak valid.', false);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const [mapLoaded, setMapLoaded] = useState(false);

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

        const initialCenterLng = simGpsRef.current.lng || 107.6036;
        const initialCenterLat = simGpsRef.current.lat || -6.9125;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: darkStyle,
            center: [initialCenterLng, initialCenterLat],
            zoom: 15,
            pitch: 45,
            attributionControl: false
        });

        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-[0_0_15px_rgba(238,111,31,0.8)]';
        const initialMapLng = simGpsRef.current.lng || 107.6036;
        const initialMapLat = simGpsRef.current.lat || -6.9125;
        markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([initialMapLng, initialMapLat])
            .addTo(map.current!);

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        }
    }, []);

    // Effect for handling GeoJSON changes
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (!route?.geojson) {
            // Remove existing route-path if geojson is deleted
            const source = map.current.getSource('route-path');
            if (source) {
                if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
                if (map.current.getLayer('route-line-glow')) map.current.removeLayer('route-line-glow');
                if (map.current.getLayer('station-points')) map.current.removeLayer('station-points');
                map.current.removeSource('route-path');
            }
            return;
        }

        try {
            const geojson = typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson;

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
                        'line-color': '#1d2d6a',
                        'line-width': 6,
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

            const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);
            const lineStringFeature = features.find((f: any) => f.geometry?.type === 'LineString' || f.type === 'LineString');
            const coordinates = lineStringFeature?.geometry?.coordinates || lineStringFeature?.coordinates;

            // Removed static geofencing layers from PIDS Tab as per user request

            if (coordinates && coordinates.length > 0) {
                if (!existingSource) {
                    const bounds = coordinates.reduce((bounds: maplibregl.LngLatBounds, coord: [number, number]) => {
                        return bounds.extend(coord);
                    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

                    // Only fit bounds if we don't have a valid train location
                    if (!simGpsRef.current.lng) {
                        map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
                    }
                }
            }

        } catch (err) {
            console.error("Failed to render GeoJSON:", err);
        }
    }, [route?.geojson, mapLoaded]);

    return (
        <div className="flex flex-col gap-6 w-full max-w-full pb-32">

            {/* INFO RANGKAIAN & TELEMETRI HEADER */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                <div className="p-6 xl:w-1/3 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col">
                    <div className="flex items-center gap-3 mb-5 shrink-0">
                        <div className="text-[#ee6f1f]"><Train size={24} /></div>
                        <h3 className="font-black text-[#1d2d6a] text-sm">Status Perjalanan</h3>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 justify-center">
                        {/* Identitas */}
                        <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-400 mb-0.5">No KA / Nama</span>
                                <span className="text-[16px] font-black text-[#1d2d6a]">KA {activeTrainNumber} - {activeTrainName}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[14px] font-bold text-slate-400 mb-0.5">Relasi</span>
                                <span className="text-[16px] font-black text-[#1d2d6a]">{relasiCode}</span>
                            </div>
                        </div>

                        {/* Berangkat & Tiba */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[12px] font-bold text-slate-400 block mb-0.5">Berangkat</span>
                                <span className="text-[14px] font-black text-[#1d2d6a]">{departureLabel}</span>
                            </div>
                            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[12px] font-bold text-slate-400 block mb-0.5">Tiba</span>
                                <span className="text-[14px] font-black text-[#1d2d6a]">{arrivalLabel}</span>
                            </div>
                        </div>
                        {/* Standby Confirmation Modal */}
                        <AnimatePresence>
                            {showStandbyConfirm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowStandbyConfirm(false)}
                                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
                                    >
                                        <div className="p-8 pb-6 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                                                <MonitorPlay size={32} className="text-blue-600" />
                                            </div>
                                            <h3 className="text-xl font-black text-[#1d2d6a] tracking-tight mb-3">
                                                Konfirmasi Tampilan Video
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[280px]">
                                                Apakah Anda yakin ingin menampilkan video di Layar TV?
                                            </p>
                                        </div>
                                        <div className="p-6 bg-slate-50 flex gap-3">
                                            <button
                                                onClick={() => setShowStandbyConfirm(false)}
                                                className="flex-1 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-100 transition-all active:scale-95"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleVideoAction({ tvStandby: false });
                                                    setShowStandbyConfirm(false);
                                                }}
                                                className="flex-1 px-6 py-3.5 rounded-2xl bg-[#1d2d6a] text-white text-xs font-black shadow-lg shadow-blue-900/20 hover:bg-[#152355] transition-all active:scale-95"
                                            >
                                                Tampilkan
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* POI Info Terdekat */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-bold text-slate-400 mb-0.5">POI Terdekat</span>
                                    <span className="text-[14px] font-black text-[#ee6f1f]">{nearestPoi}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[14px] font-bold text-slate-400 mb-0.5">Jarak ke Tujuan</span>
                                    <span className="text-[14px] font-black text-[#ee6f1f]">{distToNext}</span>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100" />

                            <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-bold text-blue-500 mb-0.5">Status Aktual</span>
                                    <span className="text-[13px] font-black text-[#1d2d6a]">Menuju ke {nextStationName}</span>
                                </div>
                                <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold text-[#ee6f1f] block mb-0.5">ETA</span>
                                    <span className="text-[14px] font-black text-[#ee6f1f]">{etaTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 xl:w-2/3 bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="text-[#ee6f1f]"><Satellite size={24} /></div>
                            <h3 className="font-black text-[#1d2d6a] text-sm">Telemetri Satelit (GPS)</h3>
                        </div>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hidden sm:flex items-center gap-2">
                            TANGGAL: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="bg-[#ee6f1f] p-5 rounded-2xl border border-[#ee6f1f] shadow-sm lg:col-span-3 relative overflow-hidden group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="absolute right-0 top-0 bottom-0 w-48 bg-[#ee6f1f]/50 group-hover:bg-[#ee6f1f]/20 transition-transform duration-500 transform -skew-x-12 translate-x-10" />
                            <div className="relative z-10 flex flex-col">
                                <div className="text-sm text-slate-50 font-bold mb-1 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-100 animate-pulse" />
                                    Kecepatan
                                </div>
                                <div className="text-xs text-slate-200 font-medium">Realtime Speed (GPS)</div>
                            </div>
                            <div className="text-5xl font-mono font-black text-slate-50  leading-none relative z-10 text-right drop-shadow-sm flex items-baseline">
                                {(data?.speed || 0).toFixed(1)}<span className="text-base font-sans ml-2 text-slate-50 font-bold">km/h</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[12px] text-slate-400 font-bold mb-1 flex justify-between">Longitude <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div id="gps-lng" className="text-xl font-mono font-black text-[#1d2d6a]">{simGps.lng.toFixed(6)}</div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Garis Bujur Timur
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[12px] text-slate-400 font-bold mb-1 flex justify-between">Latitude <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div id="gps-lat" className="text-xl font-mono font-black text-[#1d2d6a]">{simGps.lat.toFixed(6)}</div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Garis Lintang Selatan
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[12px] text-slate-400 font-bold mb-1 flex justify-between">Haluan (Dir) <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="text-xl font-mono font-black text-[#1d2d6a]">{simGps.heading.toFixed(2)}&deg;</div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Arah Orientasi KA
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[12px] text-slate-400 font-bold mb-1 flex justify-between">Ketinggian <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="text-xl font-mono font-black text-[#1d2d6a]">{data?.altitude || 0} <span className="text-[10px] text-slate-500">MDPL</span></div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Elevasi Permukaan
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[12px] text-slate-400 font-bold flex justify-between">Radius Luar <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="flex items-end gap-2 mt-2">
                                <input
                                    type="number"
                                    value={outerRadius}
                                    onChange={(e) => setOuterRadius(Number(e.target.value))}
                                    onBlur={sendGeofencingUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && sendGeofencingUpdate()}
                                    className="w-16 bg-white border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 text-xl font-mono font-black text-[#1d2d6a] focus:outline-none focus:border-blue-400 shadow-sm"
                                />
                                <span className="text-[10px] text-slate-500 font-bold mb-2">METER</span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Batas Jarak Toleransi
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[12px] text-slate-400 font-bold flex justify-between">Radius Dalam <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="flex items-end gap-2 mt-2">
                                <input
                                    type="number"
                                    value={innerRadius}
                                    onChange={(e) => setInnerRadius(Number(e.target.value))}
                                    onBlur={sendGeofencingUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && sendGeofencingUpdate()}
                                    className="w-16 bg-white border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 text-xl font-mono font-black focus:outline-none focus:border-blue-400 shadow-sm"
                                />
                                <span className="text-[10px] text-slate-500 font-bold mb-2">METER</span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Batas Presisi Target
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Mapbox Direct Render (GPS View) */}
                    <div className="mt-5 relative w-full h-[300px] lg:h-[400px] overflow-hidden rounded-2xl shadow-inner border border-slate-200 bg-[#0a0f1e] flex-1">
                        <div ref={mapContainer} className="absolute inset-0" />

                        {!route?.geojson && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b1437]/80 backdrop-blur-md">
                                <div className="bg-white/10 p-6 rounded-3xl border border-white/20 mb-6 shadow-2xl">
                                    <MapPin size={56} className="text-orange-400 animate-pulse" />
                                </div>
                                <h3 className="text-white font-black text-2xl mb-2 drop-shadow-lg">Peta Belum Dikonfigurasi</h3>
                                <p className="text-slate-300 text-center max-w-md px-6 text-sm font-bold tracking-tight leading-relaxed">
                                    Gunakan tombol <span className="text-[#ee6f1f] border-b-2 border-[#ee6f1f]">Import GeoJSON</span> di bawah pada bagian Rute untuk memuat koordinat navigasi dan visualisasi perjalanan.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 1. KONFIGURASI ASET & JARINGAN */}
            <SectionAccordion
                title="1. Konfigurasi Aset & Jaringan"
                icon={Settings}
                defaultOpen={true}
                summary={`${jumlahKereta} Kereta Tersambung • IP Global: 192.168.1.48`}
            >
                <div className="bg-white p-5 lg:p-6 mt-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
                    {/* Header Controls: Global IP & Controls */}
                    <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        {/* Global IP & Settings */}
                        <div className="flex flex-wrap items-center gap-4 flex-1">
                            <div className="flex flex-col">
                                <span className="text-[13px] font-black text-slate-500 mb-1">Network Global IP</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5 shadow-sm">
                                    <input type="text" defaultValue="192" className="w-[28px] text-[13px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="168" className="w-[28px] text-[13px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="1" className="w-[20px] text-[13px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="48" className="w-[24px] text-[13px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                    <StateToggle value="auto" />
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-200 hidden sm:block" />

                            {/* Toggles */}
                            <div className="flex flex-col">
                                <span className="text-[13px] font-black text-slate-500 mb-1 text-center sm:text-left">Tampilkan</span>
                                <div className="flex items-center gap-3 p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 cursor-pointer px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-blue-600 border-slate-300"
                                            checked={!!data.showTrainNumber}
                                            onChange={(e) => sendData({ showTrainNumber: e.target.checked })}
                                        /> No. KA
                                    </label>
                                    <div className="w-px h-5 bg-slate-200" />
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 cursor-pointer px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-[#ee6f1f] border-slate-300"
                                            checked={data.ledActive !== false}
                                            onChange={(e) => sendData({ ledActive: e.target.checked })}
                                        /> LED 96×16
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-500 mb-1">Jumlah Kereta</span>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                                <Train size={14} className="text-slate-400" />
                                <select className="text-xs font-black text-[#1d2d6a] bg-transparent cursor-pointer focus:outline-none min-w-[150px]" value={jumlahKereta} onChange={(e) => setJumlahKereta(Number(e.target.value))}>
                                    {[...Array(gerbongCounts[activeTrainName] || 15)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} Kereta</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>



                    {/* Visualizer */}
                    <div className="flex items-stretch gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x">
                        {['LOK', ...Array.from({ length: jumlahKereta }, (_, i) => String(i + 1))].map((item, i) => (
                            <div key={item} className={`flex shrink-0 snap-start ${i === 0 ? 'w-[150px]' : 'w-[150px] flex-1'}`}>
                                <div className="flex flex-col w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group hover:border-[#1d2d6a]/40 hover:shadow-md transition-all relative">
                                    <div className={`flex items-center justify-center h-10 shrink-0 ${i === 0 ? 'bg-slate-50 border-b border-slate-200' : 'bg-[#1d2d6a] text-white border-b border-[#152355]'}`}>
                                        <span className="text-sm font-black">{item}</span>
                                    </div>
                                    <div className="p-4 bg-white flex flex-col gap-4 flex-1">
                                        {i === 0 ? (
                                            <div className="flex flex-col gap-4 flex-1 justify-center">
                                                {/* Specialized Locomotive Style based on Image */}
                                                <div className="text-[10px] font-black text-slate-500 h-[42px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                                    ID KERETA
                                                </div>
                                                <div className="text-[10px] font-black text-slate-500 h-[42px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                                    IP KERETA
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 mb-1">Kereta</span>
                                                    <input type="text" defaultValue={`K1016${i}`} className="text-xs font-black text-[#1d2d6a] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full text-center transition-all shadow-sm" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-bold text-slate-400">IP Node</span>
                                                        <TextToggle value="auto" />
                                                    </div>
                                                    <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 shadow-sm transition-all h-[34px]">
                                                        <div className="flex items-center gap-0.5 w-full justify-center">
                                                            <input type="text" defaultValue="192" className="w-[24px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                            <span className="text-slate-300 text-[8px]">.</span>
                                                            <input type="text" defaultValue="168" className="w-[24px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                            <span className="text-slate-300 text-[8px]">.</span>
                                                            <input type="text" defaultValue="1" className="w-[12px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                            <span className="text-slate-300 text-[8px]">.</span>
                                                            <input type="text" defaultValue={50 + i} className="w-[18px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionAccordion>

            {/* 2. RUTE & CHECKPOINT NAVIGASI */}
            <SectionAccordion
                title="2. Rute & Checkpoint Navigasi"
                icon={MapPin}
                defaultOpen={true}
                summary={!route?.name ? "Pilih Rute di Selector" : `Detail ${navData.length} POI Navigasi • Lokasi Saat Ini: ${navData.find((x: any) => x.status === "BERHENTI")?.name || data?.currentStation || '-'}`}
            >
                {!route?.name || route.name === '-' ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl mt-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                            <MapPin size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-sm font-black text-[#1d2d6a] mb-1">Rute Belum Dipilih</h4>
                        <p className="text-xs font-bold text-slate-400 text-center max-w-xs tracking-tighter">Silakan pilih rute perjalanan pada aplikasi Selector untuk memulai konfigurasi navigasi.</p>
                    </div>
                ) : (
                    <>
                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500">File Aktif:</span>
                                <span className="text-sm font-black text-[#1d2d6a]">
                                    {route?.geojson ? (route.geojson_filename || `${route.name.replace(/\s+/g, '_')}.geojson`) : 'Belum Ada GeoJSON'}
                                    {route?.geojson && <span className="ml-2 text-[10px] text-green-500 font-black bg-green-50 px-1.5 py-0.5 rounded border border-green-100 italic">Aktif</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDeleteClick}
                                    disabled={uploading}
                                    className={`text-xs font-black text-red-500 bg-white hover:bg-red-50 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${uploading ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                                >
                                    <Trash2 size={14} /> {uploading ? '...' : 'Hapus'}
                                </button>
                                <label className={`text-xs font-black text-white bg-[#ee6f1f] hover:bg-[#ee6f1f]/70 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Upload size={14} className={`text-white ${uploading ? 'animate-spin' : ''}`} /> {uploading ? 'Mengunggah...' : 'Import'}
                                    <input type="file" accept=".json,.geojson" className="hidden" onChange={handleUploadGeoJSON} disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        {!route?.geojson || navData.length === 0 ? (
                            <div className="mt-4 flex flex-col items-center justify-center py-16 px-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all hover:border-slate-300">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
                                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <Info size={40} className="text-slate-300" />
                                </div>
                                <h4 className="text-sm font-black text-[#1d2d6a] mb-2">Data Navigasi Kosong</h4>
                                <p className="text-[11px] font-bold text-slate-400 text-center max-w-[280px] tracking-tight leading-relaxed">
                                    Silakan <span className="text-[#ee6f1f]">Impor GeoJSON</span> untuk memuat daftar stasiun, koordinat GPS, dan estimasi waktu kedatangan.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                                <div ref={navTableRef} className="overflow-x-auto max-h-[450px] overflow-y-auto relative">
                                    <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
                                        <thead className="bg-[#1d2d6a] text-white sticky top-0 z-20">
                                            <tr>
                                                <th className="py-3.5 px-6 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a]">Nama Stasiun</th>
                                                <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a]">Ket</th>
                                                <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-right">Longitude</th>
                                                <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-right">Latitude</th>
                                                <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-center">TTA</th>
                                                <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-center">Status</th>
                                                <th className="py-3.5 px-6 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a]">Next Stasiun</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {navData.map((item: any, idx: number) => {
                                                const isBerhenti = item.status === 'BERHENTI';
                                                return (
                                                    <tr
                                                        key={idx}
                                                        data-active={isBerhenti}
                                                        className={`hover:bg-slate-50 transition-colors ${isBerhenti ? 'bg-orange-50/100' : 'bg-white'}`}
                                                        style={{ scrollMarginTop: '46px' }}
                                                    >
                                                        <td className={`py-3 px-6 font-black flex items-center gap-2 ${isBerhenti ? 'text-[#ee6f1f]' : 'text-slate-700'}`}>
                                                            {isBerhenti && <ChevronRight size={16} className="text-[#ee6f1f]" />}
                                                            {item.name}
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-slate-500 text-xs">{item.type}</td>
                                                        <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs text-right">{item.lng}</td>
                                                        <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs text-right">{item.lat}</td>
                                                        <td className="py-3 px-4 font-mono font-black text-[#1d2d6a] text-center text-xs">{item.eta}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            {item.status ? (
                                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded shadow-sm ${isBerhenti ? 'bg-[#1d2d6a] text-white' : 'bg-slate-200 text-slate-500'
                                                                    }`}>
                                                                    {item.status}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-6 font-bold text-slate-500 text-[11px]">{item.next}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </SectionAccordion>

            {/* 3. SISTEM MEDIA & PENYIARAN */}
            <SectionAccordion
                title="3. Sistem Media & Penyiaran"
                icon={RadioTower}
                defaultOpen={true}
                summary={`Audio ${mediaSource} • Layar ${data?.tvStandby ? 'Standby' : 'Aktif'}`}
            >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">

                    {/* Audio Broadcast */}
                    <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 border-b border-slate-100 pb-2">
                            <Mic size={14} className="text-[#ee6f1f]" /> Audio Announcer
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                                <label className="text-[10px] font-bold">Sumber Output</label>
                                <select
                                    value={mediaSource}
                                    onChange={(e) => setMediaSource(e.target.value)}
                                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all cursor-pointer"
                                >
                                    <option value="Line In">Line In / Default Audio</option>
                                    <option value="Internal">Internal Storage</option>
                                </select>
                            </div>

                            <div className="flex items-end pb-[1px]">
                                <label className="flex items-center justify-center gap-3 text-sm font-black text-slate-600 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 w-full transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a] focus:ring-[#1d2d6a]" /> Enable Broadcast
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1.5 flex-1 flex flex-col focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                            <label className="text-[10px] font-bold">Teks Informasi Darurat/Manual</label>
                            <textarea
                                className="w-full h-full min-h-[80px] text-sm font-medium text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all resize-none"
                                placeholder="Ketik pesan darurat/info..."
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                            <label className="text-[10px] font-bold">Pilihan Suara</label>
                            <select
                                className="w-full text-sm font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all cursor-pointer"
                            >
                                <option value="audio1">Pengumuman_Kedatangan.mp3</option>
                                <option value="audio2">Safety_Briefing_KAI.wav</option>
                                <option value="audio3">Emergency_Alert_01.mp3</option>
                                <option value="audio4">Jingle_KAI.mp3</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => showToast('Audio dinonaktifkan')} className="text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-6 rounded-xl transition-all shadow-sm">
                                Reset
                            </button>
                            <button onClick={() => showToast('Memainkan Audio Announcer')} className="text-xs font-black text-white bg-[#1d2d6a] hover:bg-[#152355] py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all">
                                <Volume2 size={14} /> Mainkan
                            </button>
                        </div>
                    </div>

                    {/* Video Layar */}
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col relative group">

                        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-3">
                            <h4 className="flex items-center gap-2 text-xs font-black text-[#1d2d6a]">
                                <Video size={16} className="text-blue-500" /> Manajemen TV / Video
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                                <label className="flex items-center gap-2 text-[10px] font-black cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all text-slate-600 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={data?.tvStandby !== false}
                                        onChange={(e) => {
                                            const newVal = e.target.checked;
                                            if (!newVal) {
                                                setShowStandbyConfirm(true);
                                            } else {
                                                handleVideoAction({ tvStandby: true });
                                            }
                                        }}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    /> Standby
                                </label>
                                <button
                                    onClick={handleSelectDirectory}
                                    className="flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    <FolderOpen size={14} /> Pilih Direktori
                                </button>
                                <button onClick={fetchVideos} className={`text-slate-400 hover:text-blue-600 p-2 rounded-lg transition-colors ${loadingVideos ? 'animate-spin' : ''}`}>
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Video Preview Block */}
                        <div className="bg-black rounded-xl overflow-hidden border border-slate-200 shadow-inner aspect-video max-h-[200px] relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/10 backdrop-blur-[2px] rounded-2xl overflow-hidden border border-slate-200/50">
                                <AnimatePresence mode="wait">
                                    {activeFile ? (
                                        <motion.div
                                            key={`video-${activeFile}`}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.05 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="relative w-full h-full flex items-center justify-center bg-black"
                                        >
                                            <video
                                                ref={videoRef}
                                                id="master-video-preview"
                                                key={activeFile}
                                                src={`http://localhost:3001/media/video/${encodeURIComponent(activeFile)}`}
                                                autoPlay={isPlaying}
                                                loop={playbackMode.includes('repeat')}
                                                className="w-full h-full object-contain"
                                                onTimeUpdate={(e) => {
                                                    const el = e.currentTarget;
                                                    if (isNaN(el.duration)) return;
                                                    const pct = (el.currentTime / Math.max(el.duration, 1)) * 100;
                                                    if (Date.now() - lastProgressSync.current > 1000) {
                                                        handleVideoAction({ playbackProgress: pct });
                                                        lastProgressSync.current = Date.now();
                                                    }
                                                }}
                                                onEnded={() => {
                                                    if (playbackMode !== 'repeat-one' && isPlaying) nextVideo();
                                                }}
                                            />
                                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
                                                <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[70%]">
                                                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                                    <span className="text-[9px] font-black truncate">{activeFile}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const vid = document.getElementById('master-video-preview');
                                                        if (vid && vid.requestFullscreen) vid.requestFullscreen().catch(() => { });
                                                    }}
                                                    className="bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors pointer-events-auto"
                                                    title="Full Screen"
                                                >
                                                    <Maximize size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="no-video"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center gap-4 text-slate-300"
                                        >
                                            <div className="relative">
                                                <div className="absolute -inset-4 bg-blue-500/5 blur-2xl rounded-full animate-pulse" />
                                                <Video size={48} strokeWidth={1} className="relative opacity-20" />
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-black opacity-40">Tidak ada Video Aktif</span>
                                                <span className="text-[9px] font-bold text-slate-400/60 italic">Silakan pilih folder atau playlist</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Playback Progress Slider */}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-black text-blue-500 w-8 text-right">
                                {Math.floor((data?.playbackProgress || 0) / 20)}:{(Math.floor((data?.playbackProgress || 0)) % 20).toString().padStart(2, '0')}
                            </span>
                            <input
                                type="range"
                                min="0" max="100"
                                disabled={playlist.length === 0}
                                value={data?.playbackProgress || 0}
                                onChange={(e) => handleVideoAction({ playbackProgress: parseInt(e.target.value) })}
                                className={`flex-1 h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 focus:outline-none ${playlist.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            />
                            <span className="text-[10px] font-mono font-bold text-slate-400 w-8 text-left">
                                -{Math.floor((100 - (data?.playbackProgress || 0)) / 20)}:{(Math.floor(100 - (data?.playbackProgress || 0)) % 20).toString().padStart(2, '0')}
                            </span>
                        </div>

                        {/* Playback Controls Row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 py-1">
                            {/* Left Side: Modes */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
                                <button onClick={toggleRepeat} title="Repeat" className={`p-2 rounded-lg transition-all ${playbackMode.includes('repeat') ? 'text-blue-600 bg-blue-100 shadow-sm' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200'}`}>
                                    <div className="relative">
                                        <Repeat size={16} />
                                        {playbackMode === 'repeat-one' && <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-[6px] text-white w-3 h-3 rounded-full flex items-center justify-center font-black">1</span>}
                                    </div>
                                </button>
                                <button onClick={toggleShuffle} title="Shuffle" className={`p-2 rounded-lg transition-all ${playbackMode === 'shuffle' ? 'text-blue-600 bg-blue-100 shadow-sm' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200'}`}>
                                    <Shuffle size={16} />
                                </button>
                            </div>

                            {/* Center: Main Play Controls */}
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={prevVideo} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2.5 rounded-full transition-colors active:scale-95"><ChevronDown size={22} className="rotate-90" /></button>
                                <button onClick={togglePlay} className="text-white bg-[#1d2d6a] hover:bg-[#152355] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 transform hover:scale-105 border-2 border-white focus:outline-none ring-2 ring-transparent focus:ring-blue-200">
                                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={nextVideo} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2.5 rounded-full transition-colors active:scale-95"><ChevronDown size={22} className="-rotate-90" /></button>
                            </div>

                            {/* Right Side: Volume */}
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-auto mt-2 sm:mt-0">
                                <button onClick={toggleMute} className="flex-shrink-0 focus:outline-none transition-transform hover:scale-110 active:scale-95">
                                    {data?.volume === 0 ? <VolumeX size={16} className="text-slate-400" /> : <Volume2 size={16} className="text-blue-500" />}
                                </button>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={data?.volume ?? 50}
                                    onChange={(e) => handleVideoAction({ volume: parseInt(e.target.value) })}
                                    className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-500 w-7 text-right">{data?.volume ?? 50}%</span>
                            </div>
                        </div>

                        {/* Tab Switcher for Lists */}
                        <div className="flex justify-between items-center border-b border-slate-100 pt-2 pb-2 pr-2">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setVideoViewMode('playlist')}
                                    className={`flex items-center gap-2 text-[10px] font-black px-4 py-2 rounded-t-lg transition-all ${videoViewMode === 'playlist' ? 'bg-slate-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <ListVideo size={14} /> Playlist ({playlist.length})
                                </button>
                                <button
                                    onClick={() => setVideoViewMode('files')}
                                    className={`flex items-center gap-2 text-[10px] font-black px-4 py-2 rounded-t-lg transition-all ${videoViewMode === 'files' ? 'bg-slate-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Video size={14} /> Tersedia ({videoList.length})
                                </button>
                            </div>
                            {videoViewMode === 'playlist' && playlist.length > 0 && (
                                <button
                                    onClick={() => setShowClearPlaylistConfirm(true)}
                                    className="text-[9px] font-black text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Bersihkan
                                </button>
                            )}
                        </div>

                        {/* List Area */}
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 overflow-y-auto space-y-1 shadow-inner max-h-[142px] min-h-[60px]">
                            {videoViewMode === 'playlist' ? (
                                <>
                                    {playlist.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold">Playlist Kosong</div>
                                    ) : (
                                        playlist.map((file: string, i: number) => {
                                            const isActive = i === activeIndex;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => playVideoAt(i)}
                                                    className={`text-[11px] font-bold p-2.5 rounded-lg flex items-center justify-between gap-3 border transition-all cursor-pointer group/plitem ${isActive
                                                        ? 'text-blue-800 bg-blue-100/70 border-blue-200 shadow-sm'
                                                        : 'text-slate-600 bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className={`rounded-full p-1 border shadow-sm shrink-0 ${isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                                            {isActive && isPlaying ? <div className="bg-white w-1 h-2.5 animate-pulse rounded-full mx-auto" /> : <Play size={10} className="ml-[1px]" fill={isActive ? "currentColor" : "none"} />}
                                                        </div>
                                                        <span className={`truncate w-full block ${isActive ? 'font-black' : 'font-bold'}`}>{file}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 hidden group-hover/plitem:block'}`}>
                                                            {isActive ? 'Active' : ''}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFromPlaylist(i); }}
                                                            className="opacity-0 group-hover/plitem:opacity-100 p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 rounded transition-all"
                                                            title="Hapus dari playlist"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            ) : (
                                <div className="space-y-1">
                                    <div className="px-3 py-1.5 mb-2 bg-slate-100 border border-slate-200 rounded-lg flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-500 truncate max-w-[200px]" title="/public/videos">Dir: /public/videos</span>
                                    </div>
                                    {videoList.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold">Video tidak ditemukan</div>
                                    ) : (
                                        videoList.map((file, i) => (
                                            <div key={i} className="text-[11px] font-bold text-slate-600 p-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all group/vitem bg-slate-50/50">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-1.5 bg-slate-200 text-slate-400 rounded shrink-0 group-hover/vitem:bg-blue-100 group-hover/vitem:text-blue-600 transition-colors">
                                                        <Video size={12} />
                                                    </div>
                                                    <span className="truncate">{file}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addToPlaylist(file); }}
                                                    className="opacity-0 group-hover/vitem:opacity-100 p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded transition-all flex items-center gap-1 shadow-sm"
                                                    title="Tambahkan ke Playlist"
                                                >
                                                    <Plus size={12} /><span className="text-[9px] font-black hidden sm:inline">Add</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SectionAccordion>

            {/* FIXED BOTTOM TOOLBAR */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 z-[60] bg-[#1d2d6a]/95 backdrop-blur-xl border-t border-[#152355] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] px-6 py-4 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-center md:text-left">
                    <span className="text-[10px] font-black text-blue-300">Global Action Toolbar</span>
                    <span className="text-sm font-black text-white">Console PIDS</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                    <button onClick={() => showToast('Memeriksa status GPS')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <MapPin size={16} className="text-slate-200" /> Cek GPS
                    </button>
                    <button onClick={() => showToast('Menyesuaikan warna tema LED')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <Settings size={16} className="text-slate-200" /> Warna
                    </button>
                    <button onClick={() => showToast('Beralih ke tampilan Outdoor')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <MonitorPlay size={16} className="text-slate-200" /> Outdoor
                    </button>
                    <button onClick={() => showToast('Arah perjalanan dibalik')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <RefreshCw size={16} className="text-slate-200" /> Arah
                    </button>

                    <div className="w-full md:w-px md:h-8 bg-[#2a3b7a] mx-1 hidden md:block" />

                    <button onClick={() => showToast('Konfigurasi baru berhasil disimpan')} className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#ee6f1f] hover:bg-[#f87a2c] text-xs font-black text-white transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#ee6f1f]/50 active:scale-95 w-full md:w-auto">
                        <Save size={16} /> Simpan Konfig
                    </button>
                </div>
            </div>

            {/* TOAST SYSTEM */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-8 z-[70] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 min-w-[350px] max-w-[420px]"
                    >
                        {/* Status Left Border */}
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${toast.ok ? 'bg-[#1d2d6a]' : 'bg-red-600'}`} />

                        <div className="relative p-5 pl-7 pb-6">
                            {/* Close Icon (X) */}
                            <button
                                onClick={() => setToast(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-50"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>

                            <div className="flex gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-600'}`}>
                                    {toast.ok ? <Info size={24} className="text-white" /> : <AlertCircle size={24} className="text-white" />}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col pr-6">
                                    <span className={`font-semibold text-lg leading-tight mb-2 ${toast.ok ? 'text-[#1d2d6a]' : 'text-red-700'}`}>
                                        {toast.ok ? 'Informasi Sistem' : 'Peringatan Sistem'}
                                    </span>
                                    <span className="text-slate-600 font-medium text-[15px] leading-relaxed mb-5">
                                        {toast.msg}
                                    </span>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-5 items-center mt-2">
                                        <button
                                            onClick={() => setToast(null)}
                                            className="text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors"
                                        >
                                            Tutup
                                        </button>
                                        <button
                                            onClick={() => setToast(null)}
                                            className="text-[#1d2d6a] font-bold text-sm hover:text-blue-800 transition-colors"
                                        >
                                            Lihat Detail
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className={`h-1.5 w-full ${toast.ok ? 'bg-orange-100' : 'bg-red-100'} absolute bottom-0 left-0`}>
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                className={`h-full ${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-500'}`}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Standby Confirmation Modal */}
            <AnimatePresence>
                {showStandbyConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
                        >
                            <div className="bg-blue-50 p-6 flex flex-col items-center justify-center border-b border-blue-100">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500 shadow-inner">
                                    <Video size={32} />
                                </div>
                                <h3 className="text-xl font-black text-[#1d2d6a] text-center">Tampilkan Video?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold leading-relaxed">
                                Apakah Anda yakin ingin menampilkan video di Layar TV? Hal ini akan menonaktifkan mode Standby PIDS.
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    onClick={() => setShowStandbyConfirm(false)}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => {
                                        handleVideoAction({ tvStandby: false });
                                        setShowStandbyConfirm(false);
                                    }}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                                >
                                    Ya, Tampilkan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
                        >
                            <div className="bg-red-50 p-6 flex flex-col items-center justify-center border-b border-red-100">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-inner">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-[#1d2d6a] text-center">Hapus GeoJSON?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold leading-relaxed">
                                Anda yakin ingin menghapus data rute <span className="text-[#1d2d6a] font-black">{route?.name}</span>? Tindakan ini tidak dapat dibatalkan.
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDeleteGeoJSON}
                                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
                                >
                                    Ya, Hapus
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Clear Playlist Confirmation Modal */}
            <AnimatePresence>
                {showClearPlaylistConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
                        >
                            <div className="bg-red-50 p-6 flex flex-col items-center justify-center border-b border-red-100">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-inner">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-[#1d2d6a] text-center">Bersihkan Playlist?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold leading-relaxed">
                                Apakah Anda yakin ingin menghapus semua video dari playlist? Anda dapat menambahkan video kembali setelah dibersihkan.
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    onClick={() => setShowClearPlaylistConfirm(false)}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => {
                                        handleVideoAction({ videoPlaylist: [], activeVideoIndex: 0, isPlaying: false, playbackProgress: 0 });
                                        setShowClearPlaylistConfirm(false);
                                        showToast('Playlist berhasil dikosongkan', true);
                                    }}
                                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
                                >
                                    Ya, Bersihkan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full-screen Loading Overlay for GeoJSON operations */}
            <AnimatePresence>
                {uploading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 bg-[#0b1437]/80 backdrop-blur-md"
                    >
                        <div className="bg-white/10 p-8 rounded-3xl mb-6 shadow-2xl border border-white/20 flex items-center justify-center">
                            <Loader2 size={64} className="text-[#ee6f1f] animate-spin" />
                        </div>
                        <h3 className="text-white font-black text-2xl mb-2 drop-shadow-lg">Memproses Data Peta</h3>
                        <p className="text-slate-300 text-center max-w-sm px-6 text-sm font-bold tracking-tight leading-relaxed">
                            Mohon tunggu sebentar. Sistem sedang mensinkronisasi rute dan waypoint navigasi.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
