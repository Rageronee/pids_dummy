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
    city?: string;
    lat?: number;
    lon?: number;
    latitude?: number;
    longitude?: number;
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

// ---- SQL Entity Types (New) ----

export interface TrainService {
    id: number;
    name: string;
    class: string; // EKSEKUTIF, BISNIS, EKONOMI
    ka_number: string; // KA 1, KA 5, etc.
}

export interface Schedule {
    id: number;
    route_id: number;
    schedule_date: string;
    status: 'ON_TIME' | 'LATE' | 'CANCELLED';
    notes: string;
    train_name?: string;
    train_class?: string;
    ka_number?: string;
    direction?: string;
    stops?: ScheduleStop[];
}

export interface ScheduleStop {
    id: number;
    schedule_id: number;
    route_station_id: number;
    arrival_time: string;
    departure_time: string;
    platform: number;
    stop_status: 'SCHEDULED' | 'ARRIVED' | 'DEPARTED' | 'SKIPPED';
    station_name?: string;
    station_code?: string;
    sequence_order?: number;
}

export interface Unit {
    id: string;
    name: string;
    type: string;
    active: number | boolean;
}

export interface Announcement {
    id: number;
    type: 'INFO' | 'WARNING' | 'EMERGENCY';
    message: string;
    priority: number;
    active: number | boolean;
    created_at: string;
}

// ---- Socket.IO Event Types ----

export interface SocketEvents {
    'state:update': (state: PidsState) => void;
    'db:update': (data: { trainNames?: string[]; routes?: Record<string, RouteData> }) => void;
}

