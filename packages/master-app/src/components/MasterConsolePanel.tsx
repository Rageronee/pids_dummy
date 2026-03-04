import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Train, Settings, Save, RefreshCw, Volume2,
    MapPin, MonitorPlay, Mic, Play, Pause,
    ChevronDown, ChevronRight, RadioTower, Video, Info,
    ListVideo, CheckCircle2, AlertCircle, Satellite,
    Repeat, Shuffle, Plus, FolderOpen,
    Upload, Trash2, Loader2
} from 'lucide-react';

// Modern Toggle Switch Component (REFINED: Single Toggle Button)
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
            className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border shadow-sm ${isFirst
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                : 'bg-[#ee6f1f] text-white border-[#d8631c] hover:bg-[#f87a2c]'
                }`}
        >
            {internalValue.toUpperCase()}
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
            className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isFirst ? 'text-blue-500 hover:text-blue-600' : 'text-[#ee6f1f] hover:text-[#d8631c]'}`}
        >
            {internalValue.toUpperCase()}
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
                        <span className="text-sm lg:text-base font-black text-[#1d2d6a] uppercase tracking-wider">{title}</span>
                        {!isOpen && summary && (
                            <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest hidden sm:block">{summary}</div>
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
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [stationsData, setStationsData] = useState<any[]>([]);
    const [scheduleData, setScheduleData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [videoList, setVideoList] = useState<string[]>([]);
    const [videoViewMode, setVideoViewMode] = useState<'playlist' | 'files'>('playlist');
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

    // VIDEO HANDLERS & LOGIC
    const playlist = data?.videoPlaylist || [];
    const activeIndex = data?.activeVideoIndex ?? 0;
    const isPlaying = data?.isPlaying ?? false;
    const playbackMode = data?.playbackMode || 'normal';
    const progress = data?.playbackProgress || 0;

    // Simulation logic for "Literal" functionality
    useEffect(() => {
        if (!isPlaying || playlist.length === 0) return;

        const interval = setInterval(() => {
            const newProgress = Math.min(progress + 1, 100);
            if (newProgress >= 100) {
                // Auto Advance
                if (playbackMode === 'repeat-one') {
                    sendData({ playbackProgress: 0 });
                } else if (playbackMode === 'shuffle') {
                    const nextIdx = Math.floor(Math.random() * playlist.length);
                    sendData({ activeVideoIndex: nextIdx, playbackProgress: 0 });
                } else {
                    const nextIdx = (activeIndex + 1) % playlist.length;
                    sendData({ activeVideoIndex: nextIdx, playbackProgress: 0 });
                }
            } else {
                // Update progress quietly (every 2 seconds to avoid over-socketing, but local UI is fast)
                sendData({ playbackProgress: newProgress });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, progress, playlist, activeIndex, playbackMode, sendData]);

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
        handleVideoAction({ activeVideoIndex: idx, isPlaying: true, playbackProgress: 0 });
    };

    const togglePlay = () => {
        if (playlist.length === 0) return showToast('Playlist kosong');
        handleVideoAction({ isPlaying: !isPlaying });
        showToast(isPlaying ? 'Video dijeda' : 'Memutar video');
    };

    const nextVideo = () => {
        if (playlist.length === 0) return;
        const nextIdx = (activeIndex + 1) % playlist.length;
        playVideoAt(nextIdx);
    };

    const prevVideo = () => {
        if (playlist.length === 0) return;
        const prevIdx = (activeIndex - 1 + playlist.length) % playlist.length;
        playVideoAt(prevIdx);
    };

    const toggleRepeat = () => {
        const repeatModes = ['normal', 'repeat-one', 'repeat-all'];
        const currentMode = playbackMode === 'shuffle' ? 'normal' : playbackMode;
        const nextMode = repeatModes[(repeatModes.indexOf(currentMode) + 1) % repeatModes.length];
        handleVideoAction({ playbackMode: nextMode });
        showToast(`Repeat: ${nextMode.toUpperCase()}`);
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
                const headerOffset = 45;
                container.scrollTo({
                    top: row.offsetTop - headerOffset,
                    behavior: 'smooth'
                });
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
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
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
                        <h3 className="font-black text-[#1d2d6a] uppercase tracking-widest text-sm">Status Perjalanan</h3>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 justify-center">
                        {/* Identitas */}
                        <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">No KA / Nama</span>
                                <span className="text-xs font-black text-[#1d2d6a]">KA {activeTrainNumber} - {activeTrainName}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Relasi</span>
                                <span className="text-xs font-black text-[#1d2d6a]">{relasiCode}</span>
                            </div>
                        </div>

                        {/* Berangkat & Tiba */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Berangkat</span>
                                <span className="text-xs font-black text-[#1d2d6a]">{departureLabel}</span>
                            </div>
                            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tiba</span>
                                <span className="text-xs font-black text-[#1d2d6a]">{arrivalLabel}</span>
                            </div>
                        </div>

                        {/* POI Info Terdekat */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">POI Terdekat</span>
                                    <span className="text-sm font-black text-[#ee6f1f]">{nearestPoi}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Jarak ke Tujuan</span>
                                    <span className="text-xs font-black text-[#ee6f1f]">{distToNext}</span>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100" />

                            <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Status Aktual</span>
                                    <span className="text-xs font-black text-[#1d2d6a]">Menuju ke {nextStationName}</span>
                                </div>
                                <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block mb-0.5">ETA</span>
                                    <span className="text-xs font-black text-blue-700">{etaTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 xl:w-2/3 bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="text-[#ee6f1f]"><Satellite size={24} /></div>
                            <h3 className="font-black text-[#1d2d6a] uppercase tracking-widest text-sm">Telemetri Satelit (GPS)</h3>
                        </div>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hidden sm:flex items-center gap-2 tracking-widest">
                            TANGGAL: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="bg-[#ee6f1f] p-5 rounded-2xl border border-[#ee6f1f] shadow-sm lg:col-span-3 relative overflow-hidden group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="absolute right-0 top-0 bottom-0 w-48 bg-[#ee6f1f]/50 group-hover:bg-[#ee6f1f]/20 transition-transform duration-500 transform -skew-x-12 translate-x-10" />
                            <div className="relative z-10 flex flex-col">
                                <div className="text-sm text-slate-50 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-100 animate-pulse" />
                                    Kecepatan
                                </div>
                                <div className="text-xs text-slate-200 font-medium">Realtime Speed (GPS)</div>
                            </div>
                            <div className="text-5xl font-mono font-black text-slate-50  leading-none relative z-10 text-right drop-shadow-sm flex items-baseline">
                                {(data?.speed || 0).toFixed(1)}<span className="text-base font-sans tracking-widest ml-2 text-slate-50 font-bold">km/h</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Longitude <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div id="gps-lng" className="text-xl font-mono font-black text-[#1d2d6a]">{simGps.lng.toFixed(6)}</div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Garis Bujur Timur
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Latitude <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div id="gps-lat" className="text-xl font-mono font-black text-[#1d2d6a]">{simGps.lat.toFixed(6)}</div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Garis Lintang Selatan
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Haluan (Dir) <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="text-xl font-mono font-black text-[#1d2d6a]">{simGps.heading.toFixed(2)}&deg;</div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Arah Orientasi KA
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Ketinggian <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="text-xl font-mono font-black text-[#1d2d6a]">{data?.altitude || 0} <span className="text-[10px] text-slate-500 tracking-wider">MDPL</span></div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Elevasi Permukaan
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">Radius Luar <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="flex items-end gap-2 mt-2">
                                <input
                                    type="number"
                                    value={outerRadius}
                                    onChange={(e) => setOuterRadius(Number(e.target.value))}
                                    onBlur={sendGeofencingUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && sendGeofencingUpdate()}
                                    className="w-16 bg-white border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 text-xl font-mono font-black text-[#1d2d6a] focus:outline-none focus:border-blue-400 shadow-sm"
                                />
                                <span className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">METER</span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
                                Batas Jarak Toleransi
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">Radius Dalam <Info size={12} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" /></div>
                            <div className="flex items-end gap-2 mt-2">
                                <input
                                    type="number"
                                    value={innerRadius}
                                    onChange={(e) => setInnerRadius(Number(e.target.value))}
                                    onBlur={sendGeofencingUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && sendGeofencingUpdate()}
                                    className="w-16 bg-white border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 text-xl font-mono font-black focus:outline-none focus:border-blue-400 shadow-sm"
                                />
                                <span className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">METER</span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 bg-[#1d2d6a] text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg whitespace-nowrap border border-[#2a3b7a]">
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
                                <h3 className="text-white font-black text-2xl mb-2 uppercase tracking-widest drop-shadow-lg">Peta Belum Dikonfigurasi</h3>
                                <p className="text-slate-300 text-center max-w-md px-6 text-sm font-bold uppercase tracking-tight leading-relaxed">
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
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Global IP</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5 shadow-sm">
                                    <input type="text" defaultValue="192" className="w-[28px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="168" className="w-[28px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="1" className="w-[20px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="48" className="w-[24px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                    <StateToggle value="auto" />
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-200 hidden sm:block" />

                            {/* Toggles */}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center sm:text-left">Tampilkan</span>
                                <div className="flex items-center gap-3 p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-blue-600 border-slate-300"
                                            checked={!!data.showTrainNumber}
                                            onChange={(e) => sendData({ showTrainNumber: e.target.checked })}
                                        /> No. KA
                                    </label>
                                    <div className="w-px h-5 bg-slate-200" />
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
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
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Jumlah Kereta</span>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                                <Train size={14} className="text-slate-400" />
                                <select className="text-xs font-black text-[#1d2d6a] bg-transparent cursor-pointer focus:outline-none min-w-[70px]" value={jumlahKereta} onChange={(e) => setJumlahKereta(Number(e.target.value))}>
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
                                        <span className="text-sm font-black uppercase tracking-widest">{item}</span>
                                    </div>
                                    <div className="p-4 bg-white flex flex-col gap-4 flex-1">
                                        {i === 0 ? (
                                            <div className="flex flex-col gap-4 flex-1 justify-center">
                                                {/* Specialized Locomotive Style based on Image */}
                                                <div className="text-[10px] font-black text-slate-500 h-[42px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] uppercase tracking-wider">
                                                    ID KERETA
                                                </div>
                                                <div className="text-[10px] font-black text-slate-500 h-[42px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] uppercase tracking-wider">
                                                    IP KERETA
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kereta</span>
                                                    <input type="text" defaultValue={`K1016${i}`} className="text-xs font-black text-[#1d2d6a] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full text-center transition-all shadow-sm" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">IP Node</span>
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
                summary={!route?.name ? "Pilih Rute di Selector" : `Detail ${navData.length} POI Navigasi • Target Utama ${navData.find((x: any) => x.status === "BERHENTI")?.name || 'SGU'}`}
            >
                {!route?.name || route.name === '-' ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl mt-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                            <MapPin size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-sm font-black text-[#1d2d6a] uppercase tracking-widest mb-1">Rute Belum Dipilih</h4>
                        <p className="text-xs font-bold text-slate-400 text-center max-w-xs uppercase tracking-tighter">Silakan pilih rute perjalanan pada aplikasi Selector untuk memulai konfigurasi navigasi.</p>
                    </div>
                ) : (
                    <>
                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">File Aktif:</span>
                                <span className="text-sm font-black text-[#1d2d6a]">
                                    {route?.geojson ? (route.geojson_filename || `${route.name.replace(/\s+/g, '_')}.geojson`) : 'Belum Ada GeoJSON'}
                                    {route?.geojson && <span className="ml-2 text-[10px] text-green-500 font-black uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded border border-green-100 italic">Aktif</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDeleteClick}
                                    disabled={uploading}
                                    className={`text-xs font-black uppercase tracking-widest text-red-500 bg-white hover:bg-red-50 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${uploading ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                                >
                                    <Trash2 size={14} /> {uploading ? '...' : 'Hapus'}
                                </button>
                                <label className={`text-xs font-black uppercase tracking-widest text-white bg-[#ee6f1f] hover:bg-[#ee6f1f]/70 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                <h4 className="text-sm font-black text-[#1d2d6a] uppercase tracking-[0.2em] mb-2">Data Navigasi Kosong</h4>
                                <p className="text-[11px] font-bold text-slate-400 text-center max-w-[280px] uppercase tracking-tight leading-relaxed">
                                    Silakan <span className="text-[#ee6f1f]">Impor GeoJSON</span> untuk memuat daftar stasiun, koordinat GPS, dan estimasi waktu kedatangan.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                                <div ref={navTableRef} className="overflow-x-auto max-h-[450px] overflow-y-auto relative">
                                    <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
                                        <thead className="bg-[#1d2d6a] text-white sticky top-0 z-20">
                                            <tr>
                                                <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a]">Nama Stasiun</th>
                                                <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a]">Ket</th>
                                                <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a] text-right">Longitude</th>
                                                <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a] text-right">Latitude</th>
                                                <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a] text-center">TTA</th>
                                                <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a] text-center">Status</th>
                                                <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] bg-[#1d2d6a]">Next Stasiun</th>
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
                                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded tracking-widest uppercase shadow-sm ${isBerhenti ? 'bg-[#1d2d6a] text-white' : 'bg-slate-200 text-slate-500'
                                                                    }`}>
                                                                    {item.status}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider">{item.next}</td>
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
                        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                            <Mic size={14} className="text-[#ee6f1f]" /> Audio Announcer
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                                <label className="text-[10px] font-bold uppercase tracking-widest">Sumber Output</label>
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
                                <label className="flex items-center justify-center gap-3 text-sm font-black text-slate-600 uppercase tracking-wider cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 w-full transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a] focus:ring-[#1d2d6a]" /> Enable Broadcast
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1.5 flex-1 flex flex-col focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                            <label className="text-[10px] font-bold uppercase tracking-widest">Teks Informasi Darurat/Manual</label>
                            <textarea
                                className="w-full h-full min-h-[80px] text-sm font-medium text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all resize-none"
                                placeholder="Ketik pesan darurat/info..."
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                            <label className="text-[10px] font-bold uppercase tracking-widest">Pilihan Suara</label>
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
                            <button onClick={() => showToast('Audio dinonaktifkan')} className="text-xs font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-6 rounded-xl transition-all shadow-sm">
                                Reset
                            </button>
                            <button onClick={() => showToast('Memainkan Audio Announcer')} className="text-xs font-black uppercase tracking-widest text-white bg-[#1d2d6a] hover:bg-[#152355] py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all">
                                <Volume2 size={14} /> Mainkan
                            </button>
                        </div>
                    </div>

                    {/* Video Layar */}
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden group">

                        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-3">
                            <h4 className="flex items-center gap-2 text-xs font-black text-[#1d2d6a] uppercase tracking-widest">
                                <Video size={16} className="text-blue-500" /> Manajemen TV / Video
                            </h4>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setVideoViewMode(prev => prev === 'playlist' ? 'files' : 'playlist')}
                                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all shadow-sm ${videoViewMode === 'files' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    {videoViewMode === 'playlist' ? <ListVideo size={14} /> : <Video size={14} />}
                                    {videoViewMode === 'playlist' ? 'Playlist' : 'Video'}
                                </button>
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all text-slate-600 shadow-sm">
                                    <input type="checkbox" checked={data?.dvdActive} onChange={(e) => handleVideoAction({ dvdActive: e.target.checked })} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> DVD
                                </label>
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all text-slate-600 shadow-sm">
                                    <input type="checkbox" checked={data?.tvStandby} onChange={(e) => handleVideoAction({ tvStandby: e.target.checked })} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> Standby
                                </label>
                                <button
                                    onClick={handleSelectDirectory}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    <FolderOpen size={14} /> Pilih Direktori
                                </button>
                                <button onClick={fetchVideos} className={`text-slate-400 hover:text-blue-600 p-2 rounded-lg transition-colors ${loadingVideos ? 'animate-spin' : ''}`}>
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Video Preview */}
                        <div className="bg-black rounded-xl overflow-hidden border border-slate-200 shadow-inner aspect-video max-h-[200px] relative flex items-center justify-center">
                            {(() => {
                                const activeFile = playlist[activeIndex];
                                if (!activeFile) {
                                    return (
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <Video size={28} className="text-slate-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Tidak Ada Video Aktif</span>
                                        </div>
                                    );
                                }
                                return (
                                    <>
                                        <video
                                            key={activeFile}
                                            src={`http://localhost:3001/media/video/${encodeURIComponent(activeFile)}`}
                                            autoPlay={isPlaying}
                                            loop
                                            muted
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                            <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[150px]">{activeFile}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Video Content Box */}
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 overflow-auto space-y-1.5 shadow-inner min-h-[140px]">
                            {videoViewMode === 'playlist' ? (
                                <>
                                    {playlist.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Playlist Kosong</div>
                                    ) : (
                                        playlist.map((file: string, i: number) => {
                                            const isActive = i === activeIndex;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => playVideoAt(i)}
                                                    className={`text-xs font-bold p-2.5 rounded-lg flex items-center justify-between gap-3 border transition-all cursor-pointer group/plitem ${isActive
                                                        ? 'text-blue-700 bg-blue-100/50 border-blue-200 shadow-sm'
                                                        : 'text-slate-600 bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className={`rounded-full p-1 border shadow-sm shrink-0 ${isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                                            {isActive && isPlaying ? <div className="bg-blue-600 w-1 h-3 animate-pulse rounded-full mx-auto" /> : <Play size={10} className="ml-[1px]" fill={isActive ? "currentColor" : "none"} />}
                                                        </div>
                                                        <span className={`truncate w-full ${isActive ? 'font-black' : 'font-bold'}`}>{file}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-mono font-bold shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
                                                            {isActive ? 'Active' : '--:--'}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFromPlaylist(i); }}
                                                            className="opacity-0 group-hover/plitem:opacity-100 p-1 text-red-400 hover:bg-red-50 rounded transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            ) : (
                                <div className="space-y-1">
                                    <div className="px-2 py-1 mb-2 border-b border-slate-200 flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direktori: /public/videos</span>
                                        <span className="text-[9px] font-bold text-blue-500">{videoList.length} File ditemukan</span>
                                    </div>
                                    {videoList.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Video tidak ditemukan</div>
                                    ) : (
                                        videoList.map((file, i) => (
                                            <div key={i} className="text-[11px] font-bold text-slate-600 p-2 rounded-lg flex items-center gap-3 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all group/vitem">
                                                <div className="p-1.5 bg-slate-100 rounded group-hover/vitem:bg-blue-50 group-hover/vitem:text-blue-500 transition-colors">
                                                    <Video size={12} />
                                                </div>
                                                <span className="truncate flex-1">{file}</span>
                                                <button onClick={(e) => { e.stopPropagation(); addToPlaylist(file); }} className="opacity-0 group-hover/vitem:opacity-100 p-1 text-blue-500 hover:bg-blue-100 rounded transition-all">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Playback Controls & Progress */}
                        <div className="flex flex-col gap-4 mt-auto border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono font-black text-blue-500">{Math.floor(progress / 20)}:{(progress % 20).toString().padStart(2, '0')}</span>
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden cursor-pointer relative shadow-inner" onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const pct = Math.floor((x / rect.width) * 100);
                                    handleVideoAction({ playbackProgress: pct });
                                }}>
                                    <div className="absolute top-0 left-0 bottom-0 bg-blue-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400">-{Math.floor((100 - progress) / 20)}:{((100 - progress) % 20).toString().padStart(2, '0')}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4 relative min-h-[50px]">
                                {/* Left Side Tools */}
                                <div className="flex items-center gap-1">
                                    <button onClick={toggleRepeat} title="Repeat" className={`p-2 rounded-lg transition-all ${playbackMode.includes('repeat') ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                        <div className="relative">
                                            <Repeat size={18} />
                                            {playbackMode === 'repeat-one' && <span className="absolute -top-1 -right-1 bg-blue-600 text-[6px] text-white w-2.5 h-2.5 rounded-full flex items-center justify-center font-black">1</span>}
                                        </div>
                                    </button>
                                    <button onClick={toggleShuffle} title="Shuffle" className={`p-2 rounded-lg transition-all ${playbackMode === 'shuffle' ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                        <Shuffle size={18} />
                                    </button>
                                </div>

                                {/* Center Play Controls */}
                                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-5 py-2 rounded-2xl border border-slate-200 shadow-sm z-10">
                                    <button onClick={prevVideo} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><ChevronDown size={20} className="rotate-90" /></button>
                                    <button onClick={togglePlay} className="text-white bg-[#1d2d6a] hover:bg-[#152355] p-3.5 mx-2 rounded-full shadow-lg transition-all active:scale-95 hover:scale-105">
                                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <button onClick={nextVideo} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><ChevronDown size={20} className="-rotate-90" /></button>
                                </div>

                                {/* Right Side Tools */}
                                <div className="flex items-center gap-4 bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Volume2 size={16} className="text-slate-400" />
                                        <input
                                            type="range"
                                            min="0" max="100"
                                            value={data?.volume ?? 50}
                                            onChange={(e) => handleVideoAction({ volume: parseInt(e.target.value) })}
                                            className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className="text-[10px] font-mono font-bold text-slate-500 w-6">{data?.volume ?? 50}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionAccordion>

            {/* FIXED BOTTOM TOOLBAR */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 z-[60] bg-[#1d2d6a]/95 backdrop-blur-xl border-t border-[#152355] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] px-6 py-4 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-center md:text-left">
                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Global Action Toolbar</span>
                    <span className="text-sm font-black text-white uppercase tracking-wider">Console PIDS</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                    <button onClick={() => showToast('Memeriksa status GPS')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black uppercase tracking-widest text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <MapPin size={16} className="text-slate-200" /> Cek GPS
                    </button>
                    <button onClick={() => showToast('Menyesuaikan warna tema LED')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black uppercase tracking-widest text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <Settings size={16} className="text-slate-200" /> Warna
                    </button>
                    <button onClick={() => showToast('Beralih ke tampilan Outdoor')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black uppercase tracking-widest text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <MonitorPlay size={16} className="text-slate-200" /> Outdoor
                    </button>
                    <button onClick={() => showToast('Arah perjalanan dibalik')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black uppercase tracking-widest text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                        <RefreshCw size={16} className="text-slate-200" /> Arah
                    </button>

                    <div className="w-full md:w-px md:h-8 bg-[#2a3b7a] mx-1 hidden md:block" />

                    <button onClick={() => showToast('Konfigurasi baru berhasil disimpan')} className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#ee6f1f] hover:bg-[#f87a2c] text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#ee6f1f]/50 active:scale-95 w-full md:w-auto">
                        <Save size={16} /> Simpan Konfig
                    </button>
                </div>
            </div>

            {/* TOAST SYSTEM */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-24 right-8 z-[70] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] ${toast.ok
                            ? 'bg-[#1d2d6a] border border-blue-900/50'
                            : 'bg-red-600 border border-red-700/50'
                            }`}
                    >
                        <div className={`p-2 rounded-full flex items-center justify-center shrink-0 ${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-800'}`}>
                            {toast.ok ? <CheckCircle2 size={24} className="text-white" /> : <AlertCircle size={24} className="text-white" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-sm uppercase tracking-widest">
                                {toast.ok ? 'Notifikasi' : 'Kesalahan'}
                            </span>
                            <span className="text-blue-100/90 text-xs font-medium">{toast.msg}</span>
                        </div>
                    </motion.div>
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
                                <h3 className="text-xl font-black text-[#1d2d6a] uppercase tracking-widest text-center">Hapus GeoJSON?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold uppercase tracking-wide leading-relaxed">
                                Anda yakin ingin menghapus data rute <span className="text-[#1d2d6a] font-black">{route?.name}</span>? Tindakan ini tidak dapat dibatalkan.
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDeleteGeoJSON}
                                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
                                >
                                    Ya, Hapus
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
                        <h3 className="text-white font-black text-2xl mb-2 uppercase tracking-widest drop-shadow-lg">Memproses Data Peta</h3>
                        <p className="text-slate-300 text-center max-w-sm px-6 text-sm font-bold uppercase tracking-tight leading-relaxed">
                            Mohon tunggu sebentar. Sistem sedang mensinkronisasi rute dan waypoint navigasi.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
