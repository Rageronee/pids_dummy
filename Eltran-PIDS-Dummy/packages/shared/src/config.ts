export const API = import.meta.env.VITE_API_URL || "";
export const SOCKET = import.meta.env.VITE_SOCKET_URL || (API === "" ? "" : (API.startsWith("https") ? API.replace(/^https/, "wss") : API.replace(/^http/, "ws")));
export default { API, SOCKET };