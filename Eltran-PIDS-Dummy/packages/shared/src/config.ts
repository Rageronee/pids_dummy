export const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const SOCKET = import.meta.env.VITE_SOCKET_URL || (API.startsWith("https") ? API.replace(/^https/, "wss") : API.replace(/^http/, "ws"));
export default { API, SOCKET };