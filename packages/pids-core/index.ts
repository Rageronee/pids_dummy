export interface PidsPacket {
    header: string; // '*'
    controllerId: string; // '01'
    trainId: string; // '05'
    temp: number; // 24
    message: string; // 'ARGO WILIS'
    terminator: string; // '#'
}

export interface Station {
    id: string;
    name: string;
    lat: number;
    lon: number;
}

export type DisplayMode = 'pids' | 'tv';

export interface RouteData {
    name: string; // e.g. ARGO BROMO ANGGREK
    stations: string[]; // List of station names
}

export interface PidsState {
    stationName: string;
    trainNumber: string;
    nextStation: string;
    status: string;
    ledSpeed: number;
    speed: number;
    altitude: number;
    temperature: number;
    airQuality: string;
    displayMode: DisplayMode;
    stations: string[];
    activeRoute: RouteData | null;
}
