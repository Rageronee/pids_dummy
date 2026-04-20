/**
 * Hardware Abstraction Layer (HAL) — Type Definitions
 *
 * These interfaces decouple application logic from hardware specifics.
 * When migrating from dummy to real hardware:
 *   - Swap DummyAdapter with a SerialAdapter / GPIOAdapter
 *   - No UI code changes required
 */

// ---- Configuration ----

export interface HalConfig {
  /** Base URL for the PIDS API server */
  apiUrl: string;
  /** Environment mode: 'dummy' uses simulated data, 'hardware' uses real serial / GPIO */
  mode: "dummy" | "hardware";
}

// ---- Display Adapter (LED P10 / Indoor P2.5) ----

export interface IDisplayAdapter {
  /** Send scrolling text to LED matrix */
  sendText(text: string, speed: number): Promise<void>;
  /** Set fixed text portion (e.g. train number) */
  setFixedText(text: string): Promise<void>;
  /** Power on/off the display */
  setPower(on: boolean): Promise<void>;
}

// ---- TV/Video Adapter ----

export interface ITvAdapter {
  /** Play a video from playlist */
  playVideo(index: number): Promise<void>;
  /** Stop/pause playback */
  stop(): Promise<void>;
  /** Set standby mode (show PIDS info instead of video) */
  setStandby(standby: boolean): Promise<void>;
  /** Set volume (0-100) */
  setVolume(volume: number): Promise<void>;
}

// ---- Sensor Adapter (GPS, Temperature, Air Quality) ----

export interface SensorReading {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  temperature: number;
  airQuality?: string;
  timestamp: Date;
}

export interface ISensorAdapter {
  /** Get the latest sensor reading */
  getReading(): Promise<SensorReading>;
  /** Start continuous polling at given interval (ms) */
  startPolling(
    intervalMs: number,
    onData: (reading: SensorReading) => void,
  ): void;
  /** Stop continuous polling */
  stopPolling(): void;
}

// ---- PIDS Service (Orchestrator) ----

export interface IPidsService {
  display: IDisplayAdapter;
  tv: ITvAdapter;
  sensor: ISensorAdapter;

  /** Initialize all adapters */
  init(config: HalConfig): Promise<void>;
  /** Dispose all adapters */
  dispose(): Promise<void>;
}
