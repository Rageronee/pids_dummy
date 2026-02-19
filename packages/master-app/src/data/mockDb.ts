export interface Station {
    id: string;
    name: string;
    city: string;
}

export interface Train {
    id: string;
    name: string;
    type: string; // Eksekutif, Bisnis, Ekonomi
}

export interface Schedule {
    id: string;
    stationId: string;
    trainId: string;
    trainNumber: string;
    arrivalTime: string;   // HH:mm:ss
    departureTime: string; // HH:mm:ss
    nextStationId: string;
    trackNumber: number;   // Jalur
}

export const stations: Station[] = [
    { id: 'GMR', name: 'GAMBIR', city: 'JAKARTA' },
    { id: 'BD', name: 'BANDUNG', city: 'BANDUNG' },
    { id: 'YK', name: 'YOGYAKARTA', city: 'YOGYAKARTA' },
    { id: 'SGU', name: 'SURABAYA GUBENG', city: 'SURABAYA' },
    { id: 'SMT', name: 'SEMARANG TAWANG', city: 'SEMARANG' },
    { id: 'SLO', name: 'SOLO BALAPAN', city: 'SURAKARTA' },
];

export const trains: Train[] = [
    { id: 'ARG001', name: 'ARGO WILIS', type: 'EKSEKUTIF' },
    { id: 'ARG002', name: 'ARGO PARAHYANGAN', type: 'EKSEKUTIF' },
    { id: 'TUR001', name: 'TURANGGA', type: 'EKSEKUTIF' },
    { id: 'LOD001', name: 'LODAYA', type: 'EKSEKUTIF/EKONOMI' },
    { id: 'SAN001', name: 'SANCAKA', type: 'EKSEKUTIF/EKONOMI' },
];

// Mock Schedule - Focused on BANDUNG (BD) as the main hub for now
export const schedules: Schedule[] = [
    // ARGO PARAHYANGAN (GMR -> BD)
    { id: 'SCH001', stationId: 'BD', trainId: 'ARG002', trainNumber: '43', arrivalTime: '09:15:00', departureTime: '09:20:00', nextStationId: 'GMR', trackNumber: 3 },
    // ARGO WILIS (BD -> SGU)
    { id: 'SCH002', stationId: 'BD', trainId: 'ARG001', trainNumber: '6', arrivalTime: '08:00:00', departureTime: '08:10:00', nextStationId: 'SGU', trackNumber: 4 },
    // TURANGGA (SGU -> BD -> GMR)
    { id: 'SCH003', stationId: 'BD', trainId: 'TUR001', trainNumber: '65', arrivalTime: '05:00:00', departureTime: '05:15:00', nextStationId: 'GMR', trackNumber: 5 },
    // LODAYA (BD -> YK -> SLO)
    { id: 'SCH004', stationId: 'BD', trainId: 'LOD001', trainNumber: '92', arrivalTime: '07:05:00', departureTime: '07:20:00', nextStationId: 'SLO', trackNumber: 2 },
    // SANCAKA (YK -> SGU) - Just to fill other stations
    { id: 'SCH005', stationId: 'YK', trainId: 'SAN001', trainNumber: '172', arrivalTime: '16:00:00', departureTime: '16:15:00', nextStationId: 'SGU', trackNumber: 1 },
];

// Helper to get formatted Time
const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // HH:mm:ss
};

export const getNextDepartures = (stationId: string): (Schedule & { trainName: string, destination: string })[] => {
    const now = getCurrentTime();

    // Sort schedules by departure time
    const stationSchedules = schedules
        .filter(s => s.stationId === stationId)
        .sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    // Find next trains (including those later today)
    // Simple logic: returns trains with departureTime > now. 
    // In a real app, we'd handle next-day rollover.
    const upcoming = stationSchedules.filter(s => s.departureTime > now);

    // If no more trains today, maybe show the first one tomorrow (simulated by showing list from start)
    const displayList = upcoming.length > 0 ? upcoming : stationSchedules;

    return displayList.map(sch => {
        const train = trains.find(t => t.id === sch.trainId);
        const nextStation = stations.find(s => s.id === sch.nextStationId);
        return {
            ...sch,
            trainName: train?.name || 'UNKNOWN',
            destination: nextStation?.name || 'UNKNOWN'
        };
    });
};
