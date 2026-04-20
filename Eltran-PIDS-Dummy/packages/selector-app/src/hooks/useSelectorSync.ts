/** /selector-app/src/hooks/useSelectorSync.ts — untuk mengubah: komponen PIDS; fungsi utama: useSelectorSync */

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { AuthUser, PidsState } from "@eltran/pids-core";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function normalizeStations(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean);
}

export function useSelectorSync() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [data, setData] = useState<PidsState | null>(null);
  const [stations, setStations] = useState<string[]>([]);
  const [masterSyncedServiceName, setMasterSyncedServiceName] = useState("");
  const [masterSyncedNumber, setMasterSyncedNumber] = useState("");
  const [masterSyncedLedSpeed, setMasterSyncedLedSpeed] = useState(60);
  const [coachCount, setCoachCount] = useState(10);
  const [trainNames, setTrainNames] = useState<string[]>([]);
  const [routes, setRoutes] = useState<any>({});
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(700);
  const [temp, setTemp] = useState(24);

  const socketRef = useRef<Socket | null>(null);
  const sendData = useCallback(
    async (newData: any) => {
      try {
        await fetch(`${API_URL}/api/state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(newData),
        });
        return true;
      } catch (e) {
        console.error("Error posting PIDS state:", e);
        return false;
      }
    },
    [authToken],
  );
  useEffect(() => {
    const token = sessionStorage.getItem("pids_token");
    const userStr = sessionStorage.getItem("pids_user");
    if (token && userStr) {
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setAuthToken(token);
            setAuthUser(JSON.parse(userStr));
          } else {
            sessionStorage.removeItem("pids_token");
            sessionStorage.removeItem("pids_user");
          }
        })
        .catch(() => {
          sessionStorage.removeItem("pids_token");
          sessionStorage.removeItem("pids_user");
          setAuthToken("");
          setAuthUser(null);
        });
    }
  }, []);
  useEffect(() => {
    fetch(`${API_URL}/api/db`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.trainNames) {
          setTrainNames(d.data.trainNames);
          setRoutes(d.data.routes || {});
        }
      })
      .catch((e) => {
        console.error("[SelectorSync] DB fetch failed:", e);
      });
    fetch(`${API_URL}/api/state`)
      .then((r) => r.json())
      .then((s) => {
        if (s) {
          setData(s);
          if (s.serviceName !== undefined)
            setMasterSyncedServiceName(s.serviceName);
          if (s.trainNumber !== undefined) setMasterSyncedNumber(s.trainNumber);
          if (s.coachCount !== undefined) setCoachCount(s.coachCount);
          if (s.ledSpeed !== undefined) setMasterSyncedLedSpeed(s.ledSpeed);
          if (s.stations) setStations(normalizeStations(s.stations));
        }
      })
      .catch((e) => {
        console.error("[SelectorSync] State fetch failed:", e);
      });
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[Socket.IO] Selector connected"));
    socket.on("state:update", (parsed: any) => {
      setData(parsed);
      if (parsed.serviceName !== undefined)
        setMasterSyncedServiceName(parsed.serviceName);
      if (parsed.trainNumber !== undefined)
        setMasterSyncedNumber(parsed.trainNumber);
      if (parsed.coachCount !== undefined) setCoachCount(parsed.coachCount);
      if (parsed.ledSpeed !== undefined)
        setMasterSyncedLedSpeed(parsed.ledSpeed);
      if (parsed.stations) setStations(normalizeStations(parsed.stations));
    });
    socket.on("db:update", (dbUpdate: any) => {
      if (dbUpdate.trainNames) setTrainNames(dbUpdate.trainNames);
      if (dbUpdate.routes) setRoutes(dbUpdate.routes);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      setSpeed((prev) => {
        const newSpeed = Math.round(
          Math.max(0, Math.min(120, prev + (Math.random() - 0.5) * 5)),
        );
        return newSpeed;
      });
      setAltitude((prev) => Math.round(prev + (Math.random() - 0.5) * 2));
      setTemp(
        (prev) => Math.round((prev + (Math.random() - 0.5) * 0.2) * 10) / 10,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const telemetryRef = useRef({ speed, altitude, temp });
  useEffect(() => {
    telemetryRef.current = { speed, altitude, temp };
  }, [speed, altitude, temp]);
  useEffect(() => {
    const syncTimer = setInterval(() => {
      const { speed: s, altitude: a, temp: t } = telemetryRef.current;
      sendData({ speed: s, altitude: a, temperature: t });
    }, 2000);
    return () => clearInterval(syncTimer);
  }, [sendData]);
  const handleLogin = useCallback((user: AuthUser, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
    sessionStorage.removeItem("pids_token");
    sessionStorage.removeItem("pids_user");
    setAuthUser(null);
    setAuthToken("");
  }, [authToken]);

  return {
    authUser,
    authToken,
    handleLogin,
    handleLogout,
    data,
    stations,
    setStations,
    masterSyncedServiceName,
    masterSyncedNumber,
    masterSyncedLedSpeed,
    setMasterSyncedLedSpeed,
    coachCount,
    trainNames,
    routes,
    speed,
    altitude,
    temp,
    sendData,
  };
}
