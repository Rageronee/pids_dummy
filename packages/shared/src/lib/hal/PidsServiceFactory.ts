/**
 * Factory for creating the appropriate PidsService based on environment.
 * 
 * MIGRATION GUIDE:
 * ================
 * When hardware is ready, create a new file `HardwareAdapter.ts` with:
 *   - HardwareDisplayAdapter (sends serial commands to P10 via USB/UART)
 *   - HardwareTvAdapter (sends HDMI-CEC commands or serial to TV controller)
 *   - HardwareSensorAdapter (reads from GNSS/GPS module via UART, I2C for temp, etc.)
 * 
 * Then update this factory:
 *   case 'hardware':
 *     return new HardwarePidsService();
 * 
 * No other code changes needed!
 */

import type { IPidsService, HalConfig } from './types';
import { DummyPidsService } from './DummyAdapter';

let _instance: IPidsService | null = null;

export function createPidsService(config: HalConfig): IPidsService {
    if (_instance) return _instance;

    switch (config.mode) {
        case 'hardware':
            // TODO: Import and instantiate HardwarePidsService when hardware is ready
            // import { HardwarePidsService } from './HardwareAdapter';
            // _instance = new HardwarePidsService();
            console.warn('[PidsServiceFactory] Hardware mode not yet implemented, falling back to dummy.');
            _instance = new DummyPidsService();
            break;
        case 'dummy':
        default:
            _instance = new DummyPidsService();
            break;
    }

    _instance.init(config);
    return _instance;
}

export function getPidsService(): IPidsService {
    if (!_instance) {
        throw new Error('[PidsServiceFactory] Service not initialized. Call createPidsService() first.');
    }
    return _instance;
}
