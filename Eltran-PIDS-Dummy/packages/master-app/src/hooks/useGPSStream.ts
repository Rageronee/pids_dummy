import { useState, useEffect } from 'react';
import { PidsState } from '@eltran/pids-core';

interface GpsStatus {
    isLocked: boolean;
    lat: number | null;
    lon: number | null;
    speed: number;
    altitude: number;
    lastUpdate: Date | null;
    error: Error | null;
}

/**
 * Architectural Hook for GPS Module tracking.
 * For dummy simulation, parses speed & altitude from the PIDS State.
 * In a real environment, this would poll a Serial Port or specialized local API for NMEA sentences.
 */
export const useGPSStream = (pidsStatePartials?: Partial<PidsState>): GpsStatus => {
    const [status, setStatus] = useState<GpsStatus>({
        isLocked: false,
        lat: null,
        lon: null,
        speed: 0,
        altitude: 0,
        lastUpdate: null,
        error: null,
    });

    useEffect(() => {
        // Fallback dummy tracking using `pidsStatePartials`
        if (pidsStatePartials) {
            setStatus(prev => ({
                ...prev,
                isLocked: true, // Assuming locked if we get state
                speed: pidsStatePartials.speed || prev.speed,
                altitude: pidsStatePartials.altitude || prev.altitude,
                lastUpdate: new Date()
            }));
        }

        // Setup real local polling here in the future
        // const pollGNSS = () => fetch('http://localhost:3002/api/gps');

    }, [pidsStatePartials?.speed, pidsStatePartials?.altitude]);

    return status;
};
