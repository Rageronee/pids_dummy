/** /shared/src/lib/hal/PidsServiceFactory.ts — untuk mengubah: komponen PIDS; fungsi utama: PidsServiceFactory */

import type { IPidsService, HalConfig } from "./types";
import { DummyPidsService } from "./DummyAdapter";

let _instance: IPidsService | null = null;

export function createPidsService(config: HalConfig): IPidsService {
  if (_instance) return _instance;

  switch (config.mode) {
    case "hardware":
      console.warn(
        "[PidsServiceFactory] Hardware mode not yet implemented, falling back to dummy.",
      );
      _instance = new DummyPidsService();
      break;
    case "dummy":
    default:
      _instance = new DummyPidsService();
      break;
  }

  _instance.init(config);
  return _instance;
}

export function getPidsService(): IPidsService {
  if (!_instance) {
    throw new Error(
      "[PidsServiceFactory] Service not initialized. Call createPidsService() first.",
    );
  }
  return _instance;
}
