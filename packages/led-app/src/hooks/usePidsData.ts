import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:3001/api/state';
const SOCKET_URL = 'http://localhost:3001';

export const usePidsData = () => {
    const [data, setData] = useState<{
        serviceName: string;
        currentStation: string;
        trainNumber: string;
        nextStation: string;
        status: string;
        ledSpeed: number;
        speed: number;
        altitude: number;
        temperature: number;
        airQuality: string;
        displayMode: string;
        stations?: string[];
        activeRoute?: any;
    }>({
        serviceName: 'Belum Dikonfigurasi',
        currentStation: '-',
        trainNumber: '-',
        nextStation: '-',
        status: 'STANDBY',
        ledSpeed: 60,
        speed: 0,
        altitude: 0,
        temperature: 0,
        airQuality: '-',
        displayMode: 'pids',
        stations: []
    });

    const socketRef = useRef<Socket | null>(null);

    // Initial fetch via HTTP
    const fetchState = useCallback(async () => {
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const parsed = await res.json();
                setData(prev => ({ ...prev, ...parsed }));
            }
        } catch (e) {
            console.error('[LED] Failed to fetch PIDS state:', e);
        }
    }, []);

    useEffect(() => {
        // Initial HTTP fetch
        fetchState();

        // Connect Socket.IO for real-time updates
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[LED] Socket.IO connected:', socket.id);
        });

        socket.on('state:update', (newState: any) => {
            setData(prev => ({ ...prev, ...newState }));
        });

        socket.on('disconnect', () => {
            console.log('[LED] Socket.IO disconnected, falling back to HTTP polling');
        });

        // Fallback: poll every 5s in case Socket.IO drops
        const fallbackInterval = setInterval(() => {
            if (!socket.connected) {
                fetchState();
            }
        }, 5000);

        return () => {
            clearInterval(fallbackInterval);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [fetchState]);

    const sendData = useCallback(async (newData: Partial<typeof data>) => {
        // Try Socket.IO first
        if (socketRef.current?.connected) {
            socketRef.current.emit('state:update', newData);
            return;
        }
        // Fallback to HTTP POST
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            if (res.ok) {
                const updated = await res.json();
                if (updated.success && updated.state) {
                    setData(prev => ({ ...prev, ...updated.state }));
                }
            }
        } catch (e) {
            console.error('[LED] Error posting PIDS state:', e);
        }
    }, []);

    return { data, sendData };
};
