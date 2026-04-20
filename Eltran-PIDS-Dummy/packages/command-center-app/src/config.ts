/*
 * config.ts — Command Center config
 *
 * Exposes API base URL for UI components.
 * Use VITE_API_URL in .env to override in development.
 */
import { API as SHARED_API } from "@eltran/shared";
export const API = SHARED_API;
