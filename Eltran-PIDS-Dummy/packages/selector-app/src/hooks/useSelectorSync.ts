/**
 * useSelectorSync — Extracts all WebSocket, API, and state sync logic.
 * 
 * RPi5 Optimization: This hook centralizes all IO so that components
 * only re-render when their specific data slice changes.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AuthUser, PidsState } from '@eltran/pids-core';

const API_URL = 'http://localhost:3001';

export function useSelectorSync() {
    // Auth
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [authToken, setAuthToken] = useState('');

    // PIDS State from Master
    const [data, setData] = useState<PidsState | null>(null);
    const [stations, setStations] = useState<string[]>([]);
    const [masterSyncedServiceName, setMasterSyncedServiceName] = useState('');
    const [masterSyncedNumber, setMasterSyncedNumber] = useState('');
    const [masterSyncedLedSpeed, setMasterSyncedLedSpeed] = useState(60);
    const [coachCount, setCoachCount] = useState(10);

    // DB State
    const [trainNames, setTrainNames] = useState<string[]>([]);
    const [routes, setRoutes] = useState<any>({});

    // Telemetry (simulated)
    const [speed, setSpeed] = useState(0);
    const [altitude, setAltitude] = useState(700);
    const [temp, setTemp] = useState(24);

    const socketRef = useRef<Socket | null>(null);

    // ---- sendData: push state updates to master ----
    const sendData = useCallback(async (newData: any) => {
        try {
            await fetch(`${API_URL}/api/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
                body: JSON.stringify(newData)
            });
        } catch (e) {
            console.error('Error posting PIDS state:', e);
        }
    }, [authToken]);

    // ---- Auth: restore session ----
    useEffect(() => {
        const token = sessionStorage.getItem('pids_token');
        const userStr = sessionStorage.getItem('pids_user');
        if (token && userStr) {
            fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    if (d.success) { setAuthToken(token); setAuthUser(JSON.parse(userStr)); }
                    else { sessionStorage.removeItem('pids_token'); sessionStorage.removeItem('pids_user'); }
                }).catch(() => { setAuthToken(token); setAuthUser(JSON.parse(userStr)); });
        }
    }, []);

    // ---- Socket.IO + initial fetch ----
    useEffect(() => {
        // Fetch DB
        fetch(`${API_URL}/api/db`).then(r => r.json()).then(d => {
            if (d.success && d.data?.trainNames) { setTrainNames(d.data.trainNames); setRoutes(d.data.routes || {}); }
        }).catch(() => { });

        // Fetch State
        fetch(`${API_URL}/api/state`).then(r => r.json()).then(s => {
            if (s) {
                setData(s);
                if (s.serviceName !== undefined) setMasterSyncedServiceName(s.serviceName);
                if (s.trainNumber !== undefined) setMasterSyncedNumber(s.trainNumber);
                if (s.coachCount !== undefined) setCoachCount(s.coachCount);
                if (s.ledSpeed !== undefined) setMasterSyncedLedSpeed(s.ledSpeed);
                if (s.stations && Array.isArray(s.stations)) setStations(s.stations);
            }
        }).catch(() => { });

        // Socket.IO
        const socket = io(API_URL, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 1000 });
        socketRef.current = socket;

        socket.on('connect', () => console.log('[Socket.IO] Selector connected'));
        socket.on('state:update', (parsed: any) => {
            setData(parsed);
            if (parsed.serviceName !== undefined) setMasterSyncedServiceName(parsed.serviceName);
            if (parsed.trainNumber !== undefined) setMasterSyncedNumber(parsed.trainNumber);
            if (parsed.coachCount !== undefined) setCoachCount(parsed.coachCount);
            if (parsed.ledSpeed !== undefined) setMasterSyncedLedSpeed(parsed.ledSpeed);
            if (parsed.stations && Array.isArray(parsed.stations)) {
                setStations(parsed.stations);
            }
        });
        socket.on('db:update', (dbUpdate: any) => {
            if (dbUpdate.trainNames) setTrainNames(dbUpdate.trainNames);
            if (dbUpdate.routes) setRoutes(dbUpdate.routes);
        });

        return () => { socket.disconnect(); socketRef.current = null; };
    }, []);

    // ---- Telemetry simulation (1s tick) ----
    useEffect(() => {
        const timer = setInterval(() => {
            setSpeed(prev => {
                const newSpeed = Math.round(Math.max(0, Math.min(120, prev + (Math.random() - 0.5) * 5)));
                return newSpeed;
            });
            setAltitude(prev => Math.round(prev + (Math.random() - 0.5) * 2));
            setTemp(prev => Math.round((prev + (Math.random() - 0.5) * 0.2) * 10) / 10);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Use refs to avoid interval recreation when telemetry values change
    const telemetryRef = useRef({ speed, altitude, temp });
    useEffect(() => {
        telemetryRef.current = { speed, altitude, temp };
    }, [speed, altitude, temp]);

    // Sync telemetry to master every 2 seconds (stable interval — no recreation)
    useEffect(() => {
        const syncTimer = setInterval(() => {
            const { speed: s, altitude: a, temp: t } = telemetryRef.current;
            sendData({ speed: s, altitude: a, temperature: t });
        }, 2000);
        return () => clearInterval(syncTimer);
    }, [sendData]);

    // ---- Auth handlers ----
    const handleLogin = useCallback((user: AuthUser, token: string) => {
        setAuthUser(user); setAuthToken(token);
    }, []);

    const handleLogout = useCallback(async () => {
        try { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }); } catch { }
        sessionStorage.removeItem('pids_token');
        sessionStorage.removeItem('pids_user');
        setAuthUser(null); setAuthToken('');
    }, [authToken]);

    return {
        // Auth
        authUser, authToken, handleLogin, handleLogout,
        // PIDS State
        data, stations, setStations,
        masterSyncedServiceName, masterSyncedNumber,
        masterSyncedLedSpeed, setMasterSyncedLedSpeed,
        coachCount,
        // DB
        trainNames, routes,
        // Telemetry
        speed, altitude, temp,
        // Actions
        sendData,
    };
}
