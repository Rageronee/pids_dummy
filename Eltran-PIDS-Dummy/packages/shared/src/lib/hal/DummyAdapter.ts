/**
 * Dummy Adapter — Mock implementations for development / testing.
 * 
 * When migrating to hardware:
 *   1. Create HardwareDisplayAdapter (serial to P10 controller)
 *   2. Create HardwareTvAdapter (HDMI-CEC or serial commands)
 *   3. Create HardwareSensorAdapter (GPS UART / I2C sensors on RPi)
 *   4. Swap in PidsServiceFactory
 */
/**
 * Ringkasan: shared\src\lib\hal\DummyAdapter.ts
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */

import type {
    IDisplayAdapter,
    ITvAdapter,
    ISensorAdapter,
    SensorReading,
    IPidsService,
    HalConfig,
} from './types';

// ---- Dummy Display ----

export class DummyDisplayAdapter implements IDisplayAdapter {
    async sendText(text: string, speed: number): Promise<void> {
        console.log(`[DummyDisplay] sendText: "${text.substring(0, 40)}..." speed=${speed}`);
    }
    async setFixedText(text: string): Promise<void> {
        console.log(`[DummyDisplay] setFixedText: "${text}"`);
    }
    async setPower(on: boolean): Promise<void> {
        console.log(`[DummyDisplay] setPower: ${on}`);
    }
}

// ---- Dummy TV ----

export class DummyTvAdapter implements ITvAdapter {
    async playVideo(index: number): Promise<void> {
        console.log(`[DummyTV] playVideo index=${index}`);
    }
    async stop(): Promise<void> {
        console.log(`[DummyTV] stop`);
    }
    async setStandby(standby: boolean): Promise<void> {
        console.log(`[DummyTV] setStandby: ${standby}`);
    }
    async setVolume(volume: number): Promise<void> {
        console.log(`[DummyTV] setVolume: ${volume}`);
    }
}

// ---- Dummy Sensor ----

export class DummySensorAdapter implements ISensorAdapter {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private speed = 0;

    async getReading(): Promise<SensorReading> {
        this.speed = Math.round(Math.max(0, Math.min(120, this.speed + (Math.random() - 0.5) * 5)));
        return {
            latitude: -6.9175 + (Math.random() - 0.5) * 0.01,
            longitude: 107.6191 + (Math.random() - 0.5) * 0.01,
            altitude: 700 + Math.round((Math.random() - 0.5) * 4),
            speed: this.speed,
            temperature: 24 + Math.round((Math.random() - 0.5) * 2 * 10) / 10,
            airQuality: 'Good',
            timestamp: new Date(),
        };
    }

    startPolling(intervalMs: number, onData: (reading: SensorReading) => void): void {
        this.stopPolling();
        this.intervalId = setInterval(async () => {
            const reading = await this.getReading();
            onData(reading);
        }, intervalMs);
    }

    stopPolling(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

// ---- Dummy PIDS Service (Orchestrator) ----

export class DummyPidsService implements IPidsService {
    display: IDisplayAdapter;
    tv: ITvAdapter;
    sensor: ISensorAdapter;

    constructor() {
        this.display = new DummyDisplayAdapter();
        this.tv = new DummyTvAdapter();
        this.sensor = new DummySensorAdapter();
    }

    async init(_config: HalConfig): Promise<void> {
        console.log('[DummyPidsService] Initialized in dummy mode');
    }

    async dispose(): Promise<void> {
        this.sensor.stopPolling();
        console.log('[DummyPidsService] Disposed');
    }
}

