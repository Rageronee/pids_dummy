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
    ip_address?: string;
    nama_pic?: string;
    kontak_pic?: string;
    kode_kota?: string;
    alamat?: string;
    provinsi?: string;
    kabupaten_kota?: string;
    kecamatan?: string;
    kelurahan_desa?: string;
    kode_pos?: string;
    poi?: string;
    media?: string;
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
    geofencingInnerRadius?: number;
    geofencingOuterRadius?: number;
    showTrainNumber?: boolean;
    showTelemetry?: boolean;
    showClock?: boolean;
    ledActive?: boolean;
    // Video / TV Management
    tvStandby?: boolean;
    videoPlaylist?: string[];
    activeVideoIndex?: number;
    isPlaying?: boolean;
    playbackProgress?: number;
    playbackMode?: string;
    volume?: number;
    muteVideo?: boolean;
    jumlahKereta?: number;
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

// ---- SQL Entity Types (SRS-compliant) ----

export interface TrainService {
    id: number;
    name: string;
    class: string; // EKSEKUTIF, BISNIS, EKONOMI
    ka_number: string; // KA 1, KA 5, etc.
    ip_address?: string;
    nama_pic?: string;
    kontak_pic?: string;
    media?: string;
}

export interface Schedule {
    id: number;
    route_id: number;
    schedule_date: string;
    status: 'ON_TIME' | 'LATE' | 'CANCELLED';
    notes: string;
    catatan?: string;
    media?: string;
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
    realisasi_datang?: string;
    realisasi_berangkat?: string;
    selisih_datang?: number;
    selisih_berangkat?: number;
    status_datang?: string;
    status_berangkat?: string;
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

// ---- NEW SRS Entities ----

export interface Gerbong {
    id: string;
    ip_address?: string;
    nama_gerbong: string;
    no_urut_gerbong: number;
    id_kereta: number;
    kereta_name?: string;
}

export interface Sensor {
    id: string;
    ip_address?: string;
    nama_device: string;
    tipe_sensor: 'GPS' | 'Suhu' | 'AQ';
    status: 'Aktif' | 'Nonaktif';
    is_main: number | boolean;
    id_gerbong: string;
}

export interface SensorData {
    id: string;
    latitude: number;
    longitude: number;
    altitude: number;
    kecepatan: number;
    suhu: number;
    poi?: string;
    waktu_rekam: string;
    id_sensor: string;
}

export interface LogMaintenance {
    id: string;
    mulai: string;
    selesai?: string;
    status: 'Open' | 'On Going' | 'Closed';
    prioritas: 'Low' | 'Medium' | 'High';
    deskripsi?: string;
    id_kereta: number;
    kereta_name?: string;
}

export interface LogOperasional {
    id: string;
    waktu: string;
    catatan?: string;
    id_kereta: number;
    id_jadwal?: number;
    kereta_name?: string;
}

// ---- GPS Fleet Types ----

export interface GpsFleetEntry {
    kereta_id: number;
    kereta_name: string;
    ka_number: string;
    gerbong_id: string;
    nama_gerbong: string;
    latitude: number;
    longitude: number;
    altitude: number;
    kecepatan: number;
    suhu: number;
    poi?: string;
    waktu_rekam: string;
}

export interface GpsGerbongEntry {
    gerbong_id: string;
    nama_gerbong: string;
    no_urut_gerbong: number;
    sensor_id: string;
    tipe_sensor: string;
    sensor_status: string;
    latitude: number;
    longitude: number;
    altitude: number;
    kecepatan: number;
    suhu: number;
    poi?: string;
    waktu_rekam: string;
}

// ---- Socket.IO Event Types ----

export interface SocketEvents {
    'state:update': (state: PidsState) => void;
    'db:update': (data: { trainNames?: string[]; routes?: Record<string, RouteData> }) => void;
}
