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
    path?: string; // SVG path for map
    nodes?: { pos: string; label: string; name: string }[]; // Map nodes
}

export interface PidsState {
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
    displayMode: DisplayMode;
    stations: string[];
    activeRoute: RouteData | null;
}

// ---- Auth & Logging Types ----

export type UserRole = 'Admin' | 'Operator';

export interface AuthUser {
    id: string;
    username: string;
    role: UserRole;
    nama: string;
}

export interface AuthSession {
    token: string;
    user: AuthUser;
}

export interface LogEntry {
    id: string;
    timestamp: string; // ISO 8601
    action: LogAction;
    user: string;
    role: string;
    details: string;
    data?: any;
}

export type LogAction =
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'STATE_UPDATE'
    | 'DISPLAY_MODE'
    | 'LED_CONFIG'
    | 'ADMIN_CRUD'
    | 'SYSTEM';
