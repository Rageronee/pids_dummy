import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api/state';

export const usePidsData = () => {
    const [data, setData] = useState<{
        serviceName: string;
        currentStation: string;
        trainNumber: string;
        nextStation: string;
        status: string;
        ledSpeed: number;
    }>({
        serviceName: 'ARGO WILIS',
        currentStation: 'BANDUNG',
        trainNumber: '01',
        nextStation: 'BANDUNG',
        status: 'ON TIME',
        ledSpeed: 60
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

    const sendData = async (newData: Partial<typeof data>) => {
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
