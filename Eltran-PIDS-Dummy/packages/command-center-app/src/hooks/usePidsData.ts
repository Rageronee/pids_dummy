import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { PidsState } from "@eltran/pids-core";

import { API as API_URL } from "../config";

const INITIAL_STATE: PidsState = {
  serviceName: "",
  currentStation: "-",
  trainNumber: "-",
  nextStation: "-",
  status: "STANDBY",
  ledSpeed: 60,
  speed: 0,
  altitude: 0,
  temperature: 0,
  airQuality: "-",
  displayMode: "pids",
  stations: [],
  activeRoute: null,
  geofencingInnerRadius: 250,
  geofencingOuterRadius: 750,
};

export function usePidsData() {
  const [data, setData] = useState<PidsState>(INITIAL_STATE);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected to PIDS server from Command Center");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected from PIDS server");
      setConnected(false);
    });

    socket.on("state:update", (newState: PidsState) => {
      setData(newState);
    });

    // Initial fetch
    fetch(`${API_URL}/api/state`)
      .then((r) => r.json())
      .then((state) => {
        if (state && state.serviceName) {
          setData(state);
        }
      })
      .catch(() => {});

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendData = useCallback(async (updates: Partial<PidsState>) => {
    try {
      const token = sessionStorage.getItem("cc_token");
      const response = await fetch(`${API_URL}/api/state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success && result.state) {
        setData(result.state);
      }
    } catch (err) {
      console.error("[PIDS] Failed to send data:", err);
    }
  }, []);

  return { data, sendData, connected };
}
