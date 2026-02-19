import { useState, useEffect } from 'react';

const SHARED_FILE_NAME = 'eltran-pids-state.json';

export const usePidsData = () => {
    const [data, setData] = useState<{
        stationName: string;
        trainNumber: string;
        nextStation: string;
        status: string;
        ledSpeed: number;
    }>({
        stationName: 'ARGO WILIS',
        trainNumber: '01',
        nextStation: 'BANDUNG',
        status: 'ON TIME',
        ledSpeed: 60
    });

    // Helper to get FS access safely
    const getFs = () => {
        if (window.require) {
            const fs = window.require('fs');
            const os = window.require('os');
            const path = window.require('path');
            const filePath = path.join(os.tmpdir(), SHARED_FILE_NAME);
            return { fs, filePath };
        }
        return null;
    };

    // Load initial state and set up polling
    useEffect(() => {
        const fsObj = getFs();
        if (!fsObj) {
            console.warn('Filesystem access not available (not running in Electron?)');
            return;
        }
        const { fs, filePath } = fsObj;

        // Function to read data
        const readData = () => {
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const parsed = JSON.parse(content);
                    setData(prev => {
                        // Only update if changed to avoid re-renders
                        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                            return { ...prev, ...parsed };
                        }
                        return prev;
                    });
                } catch (e) {
                    console.error('Error reading PIDS state:', e);
                }
            } else {
                // If file doesn't exist, create it with default data
                try {
                    fs.writeFileSync(filePath, JSON.stringify(data));
                } catch (e) {
                    console.error('Error creating PIDS state file:', e);
                }
            }
        };

        // Initial read
        readData();

        // Poll every 500ms
        const interval = setInterval(readData, 500);

        return () => clearInterval(interval);
    }, []);

    const sendData = (newData: Partial<typeof data>) => {
        const fsObj = getFs();
        if (!fsObj) return;

        const { fs, filePath } = fsObj;

        try {
            // Read current to merge
            let currentData = data;
            if (fs.existsSync(filePath)) {
                currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }

            const updated = { ...currentData, ...newData };
            fs.writeFileSync(filePath, JSON.stringify(updated));

            // Update local state immediately for feedback
            setData(updated);
        } catch (e) {
            console.error('Error writing PIDS state:', e);
        }
    };

    return { data, sendData };
};
