// ---- Domain Constants ----
export const TRAIN_STATUS = {
  ON_TIME: "ON_TIME",
  LATE: "LATE",
  CANCELLED: "CANCELLED",
  STANDBY: "STANDBY",
} as const;

export const DISPLAY_MODE = {
  PIDS: "pids",
  TV: "tv",
} as const;

export const USER_ROLE = {
  ADMIN: "Admin",
  OPERATOR: "Operator",
} as const;

export const SENSOR_TYPE = {
  GPS: "GPS",
  TEMPERATURE: "TEMPERATURE",
  AQ: "AQ",
} as const;

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
  latitude?: number;
  longitude?: number;
  ip_address?: string;
  pic_name?: string;
  pic_contact?: string;
  city_code?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
  postal_code?: string;
  poi?: string;
  media?: string;
}

export type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];

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
  coachCount?: number;
}

// ---- Auth & Logging Types ----

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
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
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "STATE_UPDATE"
  | "DISPLAY_MODE"
  | "LED_CONFIG"
  | "ADMIN_CRUD"
  | "SYSTEM";

// ---- Domain Entities ----

export interface TrainService {
  id: number;
  name: string;
  class: string; // EXECUTIVE, BUSINESS, ECONOMY
  train_number: string;
  ip_address?: string;
  pic_name?: string;
  pic_contact?: string;
  media?: string;
  origin_station_id?: string;
  destination_station_id?: string;
  coach_count: number;
  notes?: string;
}

export interface Schedule {
  id: number;
  route_id: number;
  schedule_date: string;
  status: "ON_TIME" | "LATE" | "CANCELLED";
  notes: string;
  media?: string;
  service_name?: string;
  train_class?: string;
  train_number?: string;
  direction?: string;
  stops?: ScheduleStop[];
}

export interface ScheduleStop {
  id: number;
  schedule_id: number;
  route_station_id: number;
  arrival_time: string;
  departure_time: string;
  actual_arrival?: string;
  actual_departure?: string;
  arrival_delay?: number;
  departure_delay?: number;
  arrival_status?: string;
  departure_status?: string;
  platform: number;
  stop_status: "SCHEDULED" | "ARRIVED" | "DEPARTED" | "SKIPPED";
  station_name?: string;
  station_code?: string;
  sequence_order?: number;
}

export interface Coach {
  id: string;
  ip_address?: string;
  name: string;
  sequence_number: number;
  train_service_id: number;
  media?: string;
  maintenance_log?: string;
  operational_log?: string;
}

export interface Sensor {
  id: string;
  ip_address?: string;
  device_name: string;
  sensor_type: "GPS" | "TEMPERATURE" | "AQ";
  status: "ACTIVE" | "INACTIVE";
  is_primary: boolean;
  coach_id: string;
}

export interface SensorData {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  temperature: number;
  poi?: string;
  recorded_at: string;
  sensor_id: string;
}

export interface LogMaintenance {
  id: string;
  started_at: string;
  finished_at?: string;
  status: "OPEN" | "ON_GOING" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  description?: string;
  train_service_id: number;
}

export interface LogOperasional {
  id: string;
  timestamp: string;
  notes?: string;
  train_service_id: number;
  schedule_id?: number;
}

// ---- GPS Fleet Types ----

export interface GpsFleetEntry {
  train_service_id: number;
  service_name: string;
  train_number: string;
  coach_id: string;
  coach_name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  temperature: number;
  poi?: string;
  recorded_at: string;
}

export interface GpsGerbongEntry {
  coach_id: string;
  coach_name: string;
  sequence_number: number;
  sensor_id: string;
  sensor_type: string;
  sensor_status: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  temperature: number;
  poi?: string;
  recorded_at: string;
}

// ---- Socket.IO Event Types ----

export interface SocketEvents {
  "state:update": (state: PidsState) => void;
  "db:update": (data: { trainNames?: string[]; routes?: any[] }) => void;
}
