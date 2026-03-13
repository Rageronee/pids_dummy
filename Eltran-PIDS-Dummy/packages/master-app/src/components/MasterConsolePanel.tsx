import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Train, Settings, RefreshCw, Volume2, Mic, Play, Pause,
    ChevronDown, RadioTower, Video, Info,
    ListVideo, Satellite,
    Repeat, Shuffle, Plus, FolderOpen,
    Trash2, Maximize, VolumeX
} from 'lucide-react';
import { StateToggle } from './ui/StateToggle';
import { TextToggle } from './ui/TextToggle';
import { SectionAccordion } from './ui/SectionAccordion';
import { useVideoSystem } from '../hooks/useVideoSystem';
import { RouteCheckpoints } from './RouteCheckpoints';
import { MasterToolbar } from './MasterToolbar';
import { MasterModals } from './MasterModals';


export function MasterConsolePanel({ route, data, sendData }: { route: any, data: any, sendData: (updates: any) => Promise<void> }) {
    const activeTrainName = data?.serviceName || 'Belum Dikonfigurasi';
    const [jumlahKereta, setJumlahKereta] = useState(data?.jumlahKereta || 4);
    const [gerbongCounts, setGerbongCounts] = useState<Record<string, number>>({});
    const [mediaSource, setMediaSource] = useState('Line In');
    const [audioList, setAudioList] = useState<{ name: string, url: string }[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<string>('');
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [audioSettings, setAudioSettings] = useState({ autoPlay: true, repeatMode: 'off' as 'off' | 'all' | 'one', shuffle: false });
    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const audioStateRef = useRef({ list: audioList, selected: selectedAudio, settings: audioSettings });
    const [showVideoSettings, setShowVideoSettings] = useState(false);

    useEffect(() => {
        audioStateRef.current = { list: audioList, selected: selectedAudio, settings: audioSettings };
    }, [audioList, selectedAudio, audioSettings]);
    const [outerRadius, setOuterRadius] = useState(data?.geofencingOuterRadius || 750);
    const [innerRadius, setInnerRadius] = useState(data?.geofencingInnerRadius || 250);
    const radiusRef = useRef({ inner: data?.geofencingInnerRadius || 250, outer: data?.geofencingOuterRadius || 750 });
    const [toast, setToast] = useState<{ msg: string; ok: boolean; id?: number } | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [stationsData, setStationsData] = useState<any[]>([]);
    const [scheduleData, setScheduleData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const showToast = (msg: string, ok: boolean = true) => {
        setToast({ msg, ok, id: Date.now() });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
    };

    // Video system hook
    const {
        videoList, videoViewMode, setVideoViewMode,
        showStandbyConfirm, setShowStandbyConfirm,
        showClearPlaylistConfirm, setShowClearPlaylistConfirm,
        loadingVideos, videoRef, lastProgressSync,
        playlist, activeIndex, isPlaying, playbackMode, activeFile,
        handleVideoAction, fetchVideos, toggleMute,
        addToPlaylist, removeFromPlaylist, playVideoAt,
        togglePlay, nextVideo, prevVideo,
        toggleRepeat, toggleShuffle, handleSelectDirectory,
    } = useVideoSystem(data, sendData, showToast);


    const [simGps, setSimGps] = useState({ lng: 0, lat: 0, heading: 0 });
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const simGpsRef = useRef(simGps);
    const navTableRef = useRef<HTMLDivElement>(null);
    const lastFocusedStation = useRef<string | null>(null);








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
                // Use scrollTo to prevent the whole page from jumping, only scroll the table container
                const containerHeight = container.clientHeight;
                const scrollTop = row.offsetTop - containerHeight / 2 + row.clientHeight / 2;

                container.scrollTo({
                    top: scrollTop,
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

    // Fetch initial audio list
    const fetchAudios = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:3001/api/media/audios');
            const d = await res.json();
            if (d.success) {
                const fetched = d.audios.map((a: string) => ({ name: a, url: `http://localhost:3001/media/audio/${encodeURIComponent(a)}` }));
                setAudioList(fetched);
                if (fetched.length > 0 && !selectedAudio) {
                    setSelectedAudio(fetched[0].url);
                }
            }
        } catch (e) {
            console.error("Failed to fetch audios:", e);
        }
    }, [selectedAudio]);

    useEffect(() => {
        fetchAudios();
    }, [fetchAudios]);
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
                if (res.gerbongCounts) {
                    setGerbongCounts(res.gerbongCounts);
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

    const handleLoadAudioFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newAudios = Array.from(files).map(file => ({
                name: file.name,
                url: URL.createObjectURL(file) // Create object URL for local playback
            }));

            setAudioList(prev => {
                const updated = [...prev, ...newAudios];
                if (!selectedAudio && updated.length > 0) {
                    setSelectedAudio(updated[0].url);
                }
                return updated;
            });
            showToast(`${files.length} file audio dimuat`);
        }
    };

    const handlePlayAudio = (overrideUrl?: string | React.MouseEvent) => {
        // overrideUrl can be an event object if directly called from onClick without params, so we check type
        const targetUrl = typeof overrideUrl === 'string' ? overrideUrl : selectedAudio;

        if (!targetUrl) {
            showToast('Pilih audio terlebih dahulu', false);
            return;
        }

        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
        }

        const audio = new Audio(targetUrl);
        audioPlayerRef.current = audio;

        audio.onended = () => {
            const state = audioStateRef.current;
            if (state.settings.repeatMode === 'one') {
                handlePlayAudio(targetUrl);
                return;
            }
            if (!state.settings.autoPlay) return;

            let currentIndex = state.list.findIndex(a => a.url === targetUrl);
            let nextIndex = currentIndex + 1;

            if (state.settings.shuffle) {
                nextIndex = Math.floor(Math.random() * state.list.length);
            } else if (nextIndex >= state.list.length) {
                if (state.settings.repeatMode === 'all') {
                    nextIndex = 0;
                } else {
                    return;
                }
            }

            if (nextIndex >= 0 && nextIndex < state.list.length) {
                const nextUrl = state.list[nextIndex].url;
                setSelectedAudio(nextUrl);
                handlePlayAudio(nextUrl);
            }
        };

        audio.play()
            .then(() => {
                // If it was programmatic, ensure state updates to match playing track
                if (targetUrl !== selectedAudio) {
                    setSelectedAudio(targetUrl);
                }
                const ad = audioList.find(a => a.url === targetUrl);
                showToast(`Memainkan: ${ad?.name || 'Audio'}`);
            })
            .catch(e => {
                console.error("Audio playback failed:", e);
                showToast('Gagal memainkan audio', false);
            });
    };

    const handleStopAudio = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            showToast('Audio dihentikan');
        } else {
            showToast('Tidak ada audio yang sedang dimainkan', false);
        }
    };

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

    // Auto-load route when service name is selected
    useEffect(() => {
        if (!activeTrainName || activeTrainName === 'Belum Dikonfigurasi' || route?.name === activeTrainName) return;

        const autoLoadRoute = async () => {
            try {
                const token = sessionStorage.getItem('pids_token');
                const res = await fetch(`http://localhost:3001/api/admin/routes/${encodeURIComponent(activeTrainName)}/geojson`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const apiData = await res.json();
                    if (apiData.success && apiData.geojson) {
                        const stationsList = apiData.geojson.features
                            ?.filter((f: any) => f.geometry?.type === 'Point' && f.properties?.name)
                            .map((f: any) => f.properties.name) || [];

                        await sendData({
                            serviceName: activeTrainName,
                            stations: stationsList,
                            activeRoute: {
                                name: activeTrainName,
                                geojson: apiData.geojson,
                                stations: stationsList,
                                geojson_filename: apiData.filename || `${activeTrainName}.json`
                            }
                        });
                        showToast(`Rute "${activeTrainName}" otomatis dimuat.`);
                    }
                }
            } catch (err) {
                console.error("[AutoLoadRoute] Failed to load route:", err);
            }
        };

        autoLoadRoute();
    }, [activeTrainName, route?.name]);

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

    // Helper to safely get 3 chars of station name or object
    const getStn3 = (s: any) => {
        if (!s) return '---';
        const nameStr = typeof s === 'string' ? s : (s.name || s.id || 'STN');
        return String(nameStr).substring(0, 3).toUpperCase();
    };

    const firstStationObj = stationsData.find(s => s.name === (typeof firstStation === 'string' ? firstStation : firstStation.name));
    const lastStationObj = stationsData.find(s => s.name === (typeof lastStation === 'string' ? lastStation : lastStation.name));
    const relasiCode = `${firstStationObj?.id || getStn3(firstStation)} - ${lastStationObj?.id || getStn3(lastStation)}`;

    // Derived: schedule for the active service
    const activeSchedule = scheduleData.find(s => s.train_name === activeTrainName);
    const firstStop = activeSchedule?.stops?.[0];
    const lastStop = activeSchedule?.stops?.[activeSchedule.stops.length - 1];
    const departureTime = firstStop?.departure_time || '-';
    const arrivalTime = lastStop?.arrival_time || '-';
    const departureLabel = `${firstStationObj?.id || getStn3(firstStation)} ${departureTime}`;
    const arrivalLabel = `${lastStationObj?.id || getStn3(lastStation)} ${arrivalTime}`;

    const nextStationName = data?.nextStation || (activeRouteStations.length > 1 ? activeRouteStations[1] : '-');



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



    const handleDeleteClick = () => {
        if (!route?.name) return;
        setShowDeleteModal(true);
    };

    const confirmDeleteGeoJSON = async () => {
        setShowDeleteModal(false);
        try {
            setUploading(true);
            const token = sessionStorage.getItem('pids_token');
            // Instead of deleting from DB, just clear the active state
            const res = await fetch(`http://localhost:3001/api/state`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    serviceName: '',
                    stations: [],
                    activeRoute: null
                })
            });

            if (res.ok) {
                await new Promise(r => setTimeout(r, 1500));
                showToast('Rute dilepas dari jadwal aktif (tetap tersimpan di database).');
            } else {
                let msg = 'Gagal melepas rute';
                try {
                    const err = await res.json();
                    msg = err.error || err.message || msg;
                } catch (e) { }
                showToast(msg, false);
            }
        } catch (e) {
            console.error('[GeoJSON Delete] Error:', e);
            showToast('Kesalahan koneksi saat melepas rute. Pastikan server aktif.', false);
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

                const token = sessionStorage.getItem('pids_token');
                if (!token) {
                    showToast('Sesi login tidak ditemukan. Silakan login ulang.', false);
                    setUploading(false);
                    return;
                }

                // Always create a new route named after the file (without extension)
                let routeName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

                console.log(`[GeoJSON Upload] Uploading to route: ${routeName}, file size: ${jsonStr.length} chars`);

                let res: Response;
                try {
                    res = await fetch(`http://localhost:3001/api/admin/routes/${encodeURIComponent(routeName)}/geojson`, {
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
                    // Automatically set this route as active in the system
                    try {
                        const stationsList = parsed.features
                            ?.filter((f: any) => f.geometry?.type === 'Point' && f.properties?.name)
                            .map((f: any) => f.properties.name) || [];

                        await fetch(`http://localhost:3001/api/state`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                serviceName: routeName,
                                stations: stationsList,
                                activeRoute: {
                                    name: routeName,
                                    geojson: parsed,
                                    stations: stationsList,
                                    geojson_filename: file.name
                                }
                            })
                        });
                    } catch (syncErr) {
                        console.error('[GeoJSON Upload] Failed to auto-sync state:', syncErr);
                    }

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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col xl:flex-row">
                <div className="p-8 xl:w-[38%] bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 shrink-0">
                        <div className="text-[#ee6f1f]"><Train size={24} /></div>
                        <h3 className="font-bold text-[#1d2d6a] text-xs uppercase tracking-wider">Status Perjalanan</h3>
                    </div>

                    <div className="flex flex-col gap-4 flex-1 justify-center">
                        {/* Identitas */}
                        <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">No KA / Nama</span>
                                <span className="text-xl font-bold text-[#1d2d6a]">KA {activeTrainName}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Relasi</span>
                                <span className="text-xl font-bold text-[#1d2d6a]">{relasiCode}</span>
                            </div>
                        </div>

                        {/* Berangkat & Tiba */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">Berangkat</span>
                                <span className="text-[15px] font-bold text-[#1d2d6a]">{departureLabel}</span>
                            </div>
                            <div className="bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">Tiba</span>
                                <span className="text-[15px] font-bold text-[#1d2d6a]">{arrivalLabel}</span>
                            </div>
                        </div>

                        {/* POI Info Terdekat */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-5">
                            {/* Posisi Terkini Bento Header */}
                            <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex-shrink-0">
                                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm text-[#1d2d6a]">
                                    <Train size={22} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-0.5">
                                        Posisi Terkini
                                    </span>
                                    <span className="text-base font-bold text-[#1d2d6a] uppercase tracking-tight">
                                        {data?.currentStation || firstStation}
                                    </span>
                                </div>
                            </div>

                            {/* Tujuan Berikutnya */}
                            <div className="flex flex-col gap-3.5">
                                <div className="bg-gradient-to-br from-[#1d2d6a] to-[#2b3a75] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                                    {/* Abstract BG Decor */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 group-hover:scale-125 transition-transform duration-1000" />
                                    <span className="text-[10px] font-bold text-[#ee6f1f] uppercase tracking-[0.1em] flex items-center gap-2">
                                        TUJUAN BERIKUTNYA
                                    </span>
                                    <div className="relative z-10 flex flex-col gap-5">
                                        <h4 className="text-2xl font-bold text-white uppercase tracking-tight leading-tight">
                                            {nextStationName}
                                        </h4>

                                        <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 mt-1">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.15em]">Jarak Target</span>
                                                <div className="text-lg font-bold text-white flex items-baseline gap-1">
                                                    {distToNext}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 border-l border-white/10 pl-5">
                                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.15em]">Estimasi (ETA)</span>
                                                <div className="text-lg font-bold text-[#ee6f1f] drop-shadow-[0_0_10px_rgba(238,111,31,0.3)]">
                                                    {etaTime}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 xl:w-[62%] bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="text-[#ee6f1f]"><Satellite size={24} /></div>
                            <h3 className="font-bold text-[#1d2d6a] text-xs uppercase tracking-wider">Telemetri Satelit (GPS)</h3>
                        </div>
                        <span className="text-[12px] font-bold bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-sm hidden sm:flex items-center gap-2 uppercase tracking-widest">
                            TANGGAL: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        <div className="bg-gradient-to-r from-[#ee6f1f] to-[#d46832] p-5 sm:p-6 rounded-[1.5rem] border shadow-md col-span-2 lg:col-span-3 relative overflow-hidden group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="relative z-10 flex flex-col">
                                <div className="text-lg text-white font-bold mb-1 flex items-center gap-2">
                                    Kecepatan
                                </div>
                                <div className="text-xs text-white/90 font-semibold uppercase tracking-widest">Realtime Speed (GPS)</div>
                            </div>
                            <div className="text-5xl font-mono font-bold text-white leading-none relative z-10 text-right drop-shadow-sm flex items-baseline">
                                {(data?.speed || 0).toFixed(1)}<span className="text-sm font-sans ml-3 text-white/90 font-bold uppercase">km/h</span>
                            </div>
                        </div>

                        {/* Longitude */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center uppercase tracking-wider">
                                Longitude <Info size={14} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" />
                            </div>
                            <div className="text-xl sm:text-2xl font-mono font-bold text-[#1d2d6a]">{simGps.lng.toFixed(6)}</div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-[#1d2d6a] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-[#2a3b7a]">
                                Garis Bujur Timur
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        {/* Latitude */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center uppercase tracking-wider">
                                Latitude <Info size={14} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" />
                            </div>
                            <div className="text-xl sm:text-2xl font-mono font-bold text-[#1d2d6a]">{simGps.lat.toFixed(6)}</div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-[#1d2d6a] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-[#2a3b7a]">
                                Garis Lintang Selatan
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        {/* Haluan */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center uppercase tracking-wider">
                                Haluan (Dir) <Info size={14} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" />
                            </div>
                            <div className="text-xl sm:text-2xl font-mono font-bold text-[#1d2d6a]">{simGps.heading.toFixed(2)}&deg;</div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-[#1d2d6a] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-[#2a3b7a]">
                                Arah Orientasi KA
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        {/* Ketinggian */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center uppercase tracking-wider">
                                Elevasi <Info size={14} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" />
                            </div>
                            <div className="text-xl sm:text-2xl font-mono font-bold text-[#1d2d6a] flex items-baseline gap-1.5">{data?.altitude || 0} <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">MDPL</span></div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-[#1d2d6a] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-[#2a3b7a]">
                                Ketinggian Permukaan
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        {/* Radius Luar */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center uppercase tracking-wider">
                                Rad Luar <Info size={14} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={outerRadius}
                                    onChange={(e) => setOuterRadius(Number(e.target.value))}
                                    onBlur={sendGeofencingUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && sendGeofencingUpdate()}
                                    className="w-full max-w-[6rem] bg-white border border-slate-200 rounded-lg px-2 py-1 text-lg sm:text-xl font-mono font-bold text-[#1d2d6a] transition-colors focus:outline-none focus:border-[#ee6f1f] focus:ring-1 focus:ring-[#ee6f1f] shadow-inner"
                                />
                                <span className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-widest">Meter</span>
                            </div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-[#1d2d6a] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-[#2a3b7a]">
                                Batas Toleransi Jarak
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>

                        {/* Radius Dalam */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1d2d6a]/20 transition-all flex flex-col justify-center relative group">
                            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-2 flex justify-between items-center uppercase tracking-wider">
                                Rad Dalam <Info size={14} className="text-slate-300 group-hover:text-[#ee6f1f] transition-colors cursor-help" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={innerRadius}
                                    onChange={(e) => setInnerRadius(Number(e.target.value))}
                                    onBlur={sendGeofencingUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && sendGeofencingUpdate()}
                                    className="w-full max-w-[6rem] bg-white border border-slate-200 rounded-lg px-2 py-1 text-lg sm:text-xl font-mono font-bold text-[#1d2d6a] transition-colors focus:outline-none focus:border-[#ee6f1f] focus:ring-1 focus:ring-[#ee6f1f] shadow-inner"
                                />
                                <span className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-widest">Meter</span>
                            </div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-[#1d2d6a] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-[#2a3b7a]">
                                Limit Presisi Jarak
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1d2d6a]"></div>
                            </div>
                        </div>
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
                                <span className="text-[13px] font-bold text-slate-500 mb-1">Network Global IP</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5 shadow-sm">
                                    <input type="text" defaultValue="192" className="w-[28px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="168" className="w-[28px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="1" className="w-[20px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="48" className="w-[24px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                    <StateToggle value="auto" />
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-200 hidden sm:block" />

                            {/* Toggles */}
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-500 mb-1 text-center sm:text-left">Tampilkan</span>
                                <div className="flex items-center gap-3 p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded accent-[#1d2d6a] border-slate-300"
                                            checked={!!data.showTrainNumber}
                                            onChange={(e) => sendData({ showTrainNumber: e.target.checked })}
                                        /> No. KA
                                    </label>
                                    <div className="w-px h-5 bg-slate-200" />
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded accent-[#1d2d6a] border-slate-300"
                                            checked={data.ledActive !== false}
                                            onChange={(e) => sendData({ ledActive: e.target.checked })}
                                        /> LED 96×16
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-slate-500 mb-1">Jumlah Kereta</span>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                                <Train size={14} className="text-slate-400" />
                                <select className="text-xs font-bold text-[#1d2d6a] bg-transparent cursor-pointer focus:outline-none min-w-[150px]" value={jumlahKereta} onChange={(e) => setJumlahKereta(Number(e.target.value))}>
                                    {[...Array(Math.min(gerbongCounts[activeTrainName] || 15, 15))].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} Gerbong</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>



                    {/* Visualizer */}
                    <div className="flex items-stretch gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x">
                        {[...Array.from({ length: jumlahKereta }, (_, i) => String(i + 1))].map((item, i) => (
                            <div key={item} className="flex shrink-0 snap-start w-[220px]">
                                <div className="flex flex-col w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group hover:border-[#1d2d6a]/40 hover:shadow-md transition-all relative">
                                    <div className="flex items-center justify-center h-10 shrink-0 bg-[#1d2d6a] text-white border-b border-[#152355]">
                                        <span className="text-[10px] font-bold tracking-wider">GERBONG {item}</span>
                                    </div>
                                    <div className="p-4 bg-white flex flex-col gap-4 flex-1">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-semibold text-slate-400 mb-1">ID Kereta</span>
                                            <input type="text" defaultValue={`K1016${i + 1}`} className="text-xs font-bold text-[#1d2d6a] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full text-center transition-all shadow-sm" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-bold text-slate-400">IP Node</span>
                                                <TextToggle value="auto" />
                                            </div>
                                            <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 shadow-sm transition-all h-[34px]">
                                                <div className="flex items-center gap-0.5 w-full justify-center">
                                                    <input type="text" defaultValue="192" className="w-[28px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                                    <span className="text-slate-300 text-[13px]">.</span>
                                                    <input type="text" defaultValue="168" className="w-[28px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                                    <span className="text-slate-300 text-[13px]">.</span>
                                                    <input type="text" defaultValue="1" className="w-[18px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                                    <span className="text-slate-300 text-[13px]">.</span>
                                                    <input type="text" defaultValue={51 + i} className="w-[24px] text-[13px] font-mono font-bold text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionAccordion>

            {/* 2. RUTE & CHECKPOINT NAVIGASI */}
            <RouteCheckpoints
                route={route}
                data={data}
                navData={navData}
                uploading={uploading}
                navTableRef={navTableRef}
                onUploadGeoJSON={handleUploadGeoJSON}
                onDeleteClick={handleDeleteClick}
            />

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
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <Mic size={14} className="text-[#ee6f1f]" /> Audio Announcer
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setShowAudioSettings(!showAudioSettings)}
                                    className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all shadow-sm ${showAudioSettings ? 'bg-slate-200 border-slate-300 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Settings size={14} /> Pengaturan
                                </button>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleLoadAudioFiles}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    <FolderOpen size={14} /> Load File Audio
                                </button>
                            </div>
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                                <label className="text-[10px] font-semibold">Sumber Output</label>
                                <select
                                    value={mediaSource}
                                    onChange={(e) => setMediaSource(e.target.value)}
                                    className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all cursor-pointer"
                                >
                                    <option value="Line In">Line In / Default Audio</option>
                                    <option value="Internal">Internal Storage</option>
                                </select>
                            </div>

                            <div className="flex items-end pb-[1px]">
                                <label className="flex items-center justify-center gap-3 text-sm font-bold text-slate-600 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 w-full transition-colors">
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
                        <div className="flex flex-col flex-1 min-h-[140px] border border-slate-100 rounded-xl overflow-hidden shadow-inner bg-slate-50">
                            <div className="flex justify-between items-center bg-slate-100 px-3 py-2 border-b border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><ListVideo size={12} /> Audio Playlist ({audioList.length})</span>
                                {audioList.length > 0 && (
                                    <button onClick={() => { setAudioList([]); setSelectedAudio(''); handleStopAudio(); }} className="text-[9px] font-bold text-red-500 hover:text-red-700 transition-colors px-2 py-0.5 bg-red-50 rounded border border-red-100">Bersihkan</button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[160px]">
                                {audioList.length === 0 ? (
                                    <div className="text-center text-[10px] font-bold text-slate-400 py-8">Playlist masih kosong. Silakan muat file audio.</div>
                                ) : (
                                    audioList.map((audio, i) => (
                                        <div
                                            key={i}
                                            onClick={() => { setSelectedAudio(audio.url); handlePlayAudio(audio.url); }}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all border ${selectedAudio === audio.url ? 'bg-[#1d2d6a] text-white border-[#1d2d6a] shadow-md relative overflow-hidden' : 'bg-white text-slate-600 border-slate-200 hover:border-[#1d2d6a]/30 hover:bg-blue-50/50'}`}
                                        >
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-black/10">
                                                {selectedAudio === audio.url ? <Volume2 size={12} className="animate-pulse" /> : <Mic size={10} className="opacity-50" />}
                                            </div>
                                            <span className="font-bold truncate flex-1">{audio.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={handleStopAudio} className="text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-6 rounded-xl transition-all shadow-sm">
                                Stop
                            </button>
                            <button onClick={handlePlayAudio} className="text-xs font-bold text-white bg-[#1d2d6a] hover:bg-[#152355] py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all">
                                <Volume2 size={14} /> Mainkan
                            </button>
                        </div>
                    </div>

                    {/* Video Layar */}
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col relative group">

                        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-3">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-[#1d2d6a]">
                                <Video size={16} className="text-[#1d2d6a]" /> Manajemen TV / Video
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                                <button
                                    onClick={() => setShowVideoSettings(!showVideoSettings)}
                                    className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all shadow-sm ${showVideoSettings ? 'bg-slate-200 border-slate-300 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Settings size={14} /> Pengaturan
                                </button>
                                <button
                                    onClick={handleSelectDirectory}
                                    className="flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    <FolderOpen size={14} /> Pilih Direktori
                                </button>
                                <button onClick={fetchVideos} className={`text-slate-400 hover:text-[#1d2d6a] p-2 rounded-lg transition-colors ${loadingVideos ? 'animate-spin' : ''}`}>
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
                                                muted={data?.muteVideo ?? false}
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
                                                    const autoPlayNext = data?.autoPlayNext ?? true;
                                                    if (!autoPlayNext && playbackMode !== 'repeat-one') {
                                                        if (isPlaying) togglePlay();
                                                        return;
                                                    }
                                                    if (playbackMode !== 'repeat-one' && isPlaying) nextVideo();
                                                }}
                                            />
                                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
                                                <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[70%]">
                                                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                                    <span className="text-[9px] font-bold truncate">{activeFile}</span>
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
                                                <span className="text-[10px] font-bold opacity-40">Tidak ada Video Aktif</span>
                                                <span className="text-[9px] font-bold text-slate-400/60 italic">Silakan pilih folder atau playlist</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Playback Progress Slider */}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold text-[#1d2d6a] w-8 text-right">
                                {Math.floor((data?.playbackProgress || 0) / 20)}:{(Math.floor((data?.playbackProgress || 0)) % 20).toString().padStart(2, '0')}
                            </span>
                            <input
                                type="range"
                                min="0" max="100"
                                disabled={playlist.length === 0}
                                value={data?.playbackProgress || 0}
                                onChange={(e) => handleVideoAction({ playbackProgress: parseInt(e.target.value) })}
                                className={`flex-1 h-2 bg-slate-200 rounded-lg appearance-none accent-[#1d2d6a] focus:outline-none ${playlist.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            />
                            <span className="text-[10px] font-mono font-bold text-slate-400 w-8 text-left">
                                -{Math.floor((100 - (data?.playbackProgress || 0)) / 20)}:{(Math.floor(100 - (data?.playbackProgress || 0)) % 20).toString().padStart(2, '0')}
                            </span>
                        </div>

                        {/* Playback Controls Row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 py-1">
                            {/* Left Side: Modes */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
                                <button onClick={toggleRepeat} title="Repeat" className={`p-2 rounded-lg transition-all ${playbackMode.includes('repeat') ? 'text-[#1d2d6a] bg-blue-100 shadow-sm' : 'text-slate-400 hover:text-[#1d2d6a] hover:bg-slate-200'}`}>
                                    <div className="relative">
                                        <Repeat size={16} />
                                        {playbackMode === 'repeat-one' && <span className="absolute -top-1.5 -right-1.5 bg-[#1d2d6a] text-[6px] text-white w-3 h-3 rounded-full flex items-center justify-center font-bold">1</span>}
                                    </div>
                                </button>
                                <button onClick={toggleShuffle} title="Shuffle" className={`p-2 rounded-lg transition-all ${playbackMode === 'shuffle' ? 'text-[#1d2d6a] bg-blue-100 shadow-sm' : 'text-slate-400 hover:text-[#1d2d6a] hover:bg-slate-200'}`}>
                                    <Shuffle size={16} />
                                </button>
                            </div>

                            {/* Center: Main Play Controls */}
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={prevVideo} className="text-slate-500 hover:text-[#1d2d6a] hover:bg-blue-50 p-2.5 rounded-full transition-colors active:scale-95"><ChevronDown size={22} className="rotate-90" /></button>
                                <button onClick={togglePlay} className="text-white bg-[#1d2d6a] hover:bg-[#152355] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 transform hover:scale-105 border-2 border-white focus:outline-none ring-2 ring-transparent focus:ring-blue-200">
                                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                </button>
                                <button onClick={nextVideo} className="text-slate-500 hover:text-[#1d2d6a] hover:bg-blue-50 p-2.5 rounded-full transition-colors active:scale-95"><ChevronDown size={22} className="-rotate-90" /></button>
                            </div>

                            {/* Right Side: Volume */}
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-auto mt-2 sm:mt-0">
                                <button onClick={toggleMute} className="flex-shrink-0 focus:outline-none transition-transform hover:scale-110 active:scale-95">
                                    {data?.volume === 0 ? <VolumeX size={16} className="text-slate-400" /> : <Volume2 size={16} className="text-[#1d2d6a]" />}
                                </button>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={data?.volume ?? 50}
                                    onChange={(e) => handleVideoAction({ volume: parseInt(e.target.value) })}
                                    className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1d2d6a] focus:outline-none"
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-500 w-7 text-right">{data?.volume ?? 50}%</span>
                            </div>
                        </div>

                        {/* Tab Switcher for Lists */}
                        <div className="flex justify-between items-center border-b border-slate-100 pt-2 pb-2 pr-2">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setVideoViewMode('playlist')}
                                    className={`flex items-center gap-2 text-[10px] font-bold px-4 py-2 rounded-t-lg transition-all ${videoViewMode === 'playlist' ? 'bg-slate-50 text-[#1d2d6a] border-b-2 border-[#1d2d6a]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <ListVideo size={14} /> Playlist ({playlist.length})
                                </button>
                                <button
                                    onClick={() => setVideoViewMode('files')}
                                    className={`flex items-center gap-2 text-[10px] font-bold px-4 py-2 rounded-t-lg transition-all ${videoViewMode === 'files' ? 'bg-slate-50 text-[#1d2d6a] border-b-2 border-[#1d2d6a]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Video size={14} /> Tersedia ({videoList.length})
                                </button>
                            </div>
                            {videoViewMode === 'playlist' && playlist.length > 0 && (
                                <button
                                    onClick={() => setShowClearPlaylistConfirm(true)}
                                    className="text-[9px] font-bold text-red-500 hover:text-red-700 transition-colors"
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
                                        <div className="py-8 text-center text-slate-400 text-[10px] font-semibold">Playlist Kosong</div>
                                    ) : (
                                        playlist.map((file: string, i: number) => {
                                            const isActive = i === activeIndex;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => playVideoAt(i)}
                                                    className={`text-[11px] font-bold p-2.5 rounded-lg flex items-center justify-between gap-3 border transition-all cursor-pointer group/plitem ${isActive
                                                        ? 'text-[#1d2d6a] bg-blue-100/70 border-blue-200 shadow-sm'
                                                        : 'text-slate-600 bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className={`rounded-full p-1 border shadow-sm shrink-0 ${isActive ? 'bg-[#1d2d6a] text-white border-[#152355]' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                                            {isActive && isPlaying ? <div className="bg-white w-1 h-2.5 animate-pulse rounded-full mx-auto" /> : <Play size={10} className="ml-[1px]" fill={isActive ? "currentColor" : "none"} />}
                                                        </div>
                                                        <span className={`truncate w-full block ${isActive ? 'font-bold' : 'font-semibold'}`}>{file}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold shrink-0 ${isActive ? 'text-[#1d2d6a]' : 'text-slate-400 hidden group-hover/plitem:block'}`}>
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
                                        <span className="text-[9px] font-bold text-slate-500 truncate max-w-[200px]" title="/public/videos">Dir: /public/videos</span>
                                    </div>
                                    {videoList.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-[10px] font-semibold">Video tidak ditemukan</div>
                                    ) : (
                                        videoList.map((file, i) => (
                                            <div key={i} className="text-[11px] font-bold text-slate-600 p-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all group/vitem bg-slate-50/50">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-1.5 bg-slate-200 text-slate-400 rounded shrink-0 group-hover/vitem:bg-blue-100 group-hover/vitem:text-[#1d2d6a] transition-colors">
                                                        <Video size={12} />
                                                    </div>
                                                    <span className="truncate">{file}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addToPlaylist(file); }}
                                                    className="opacity-0 group-hover/vitem:opacity-100 p-1.5 text-[#1d2d6a] bg-blue-50 hover:bg-[#1d2d6a] hover:text-white rounded transition-all flex items-center gap-1 shadow-sm"
                                                    title="Tambahkan ke Playlist"
                                                >
                                                    <Plus size={12} /><span className="text-[9px] font-bold hidden sm:inline">Add</span>
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
            <MasterToolbar jumlahKereta={jumlahKereta} sendData={sendData} showToast={showToast} />

            {/* ALL MODALS & TOAST */}
            <MasterModals
                toast={toast}
                setToast={setToast}
                showStandbyConfirm={showStandbyConfirm}
                setShowStandbyConfirm={setShowStandbyConfirm}
                handleVideoAction={handleVideoAction}
                showDeleteModal={showDeleteModal}
                setShowDeleteModal={setShowDeleteModal}
                confirmDeleteGeoJSON={confirmDeleteGeoJSON}
                routeName={route?.name || ''}
                showClearPlaylistConfirm={showClearPlaylistConfirm}
                setShowClearPlaylistConfirm={setShowClearPlaylistConfirm}
                showToast={showToast}
                uploading={uploading}
                showAudioSettings={showAudioSettings}
                setShowAudioSettings={setShowAudioSettings}
                audioSettings={audioSettings}
                setAudioSettings={setAudioSettings}
                showVideoSettings={showVideoSettings}
                setShowVideoSettings={setShowVideoSettings}
                data={data}
            />

        </div >
    );
}
