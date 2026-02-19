import { useState, useEffect } from 'react';
import { PidsState } from '@eltran/pids-core';

const API_URL = 'http://localhost:3001/api/state';

export const usePidsData = () => {
    const [data, setData] = useState<PidsState>({
        stationName: 'ARGO WILIS',
        trainNumber: '05',
        nextStation: 'TASIKMALAYA',
        status: 'ON TIME',
        ledSpeed: 60,
        speed: 15,
        altitude: 694,
        temperature: 25.1,
        airQuality: 'GOOD NOMINAL',
        displayMode: 'pids',
        stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'],
        activeRoute: null
    });

    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await fetch(API_URL);
                if (res.ok) {
                    const parsed = await res.json();
                    setData(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                            return { ...prev, ...parsed };
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error('Failed to fetch PIDS state:', e);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 500);

        return () => clearInterval(interval);
    }, []);

    const sendData = async (newData: Partial<PidsState>) => {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });

            if (res.ok) {
                const updated = await res.json();
                if (updated.success && updated.state) {
                    setData(updated.state);
                }
            }
        } catch (e) {
            console.error('Error posting PIDS state:', e);
        }
    };

    return { data, sendData };
};
