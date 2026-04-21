/** /command-center-app/src/components/MapComponent.tsx — untuk mengubah: komponen PIDS; fungsi utama: MapComponent */

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

interface TrainMarker {
  id: string;
  name: string;
  location: [number, number]; // [lng, lat]
  status: "Normal" | "Delay" | "Berhenti" | "Darurat";
  speed: number;
  eta: string;
}

interface MapComponentProps {
  trains?: TrainMarker[];
}

const MapComponent: React.FC<MapComponentProps> = ({ trains = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const style: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "carto-voyager": {
          type: "raster",
          tiles: [
            "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
          ],
          tileSize: 256,
          attribution: '&copy; CARTO',
        },
      },
      layers: [
        {
          id: "carto-voyager-layer",
          type: "raster",
          source: "carto-voyager",
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style,
      center: [106.8272, -6.1751],
      zoom: 11,
      pitch: 45,
      attributionControl: false,
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    trains.forEach(train => {
      const el = document.createElement("div");
      el.className = "relative group cursor-pointer";

      const statusColor = {
        Normal: "bg-green-500",
        Delay: "bg-amber-500",
        Berhenti: "bg-slate-500",
        Darurat: "bg-red-600"
      }[train.status];

      el.innerHTML = `
        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
          <span class="text-[10px] font-black text-[#1d2d6a] uppercase">${train.name}</span>
        </div>
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1d2d6a] px-2 py-0.5 rounded-md text-[8px] font-bold text-white shadow-md z-40">
          ${train.name}
        </div>
        <div class="w-5 h-5 ${statusColor} rounded-full border-2 border-white shadow-lg animate-pulse"></div>
      `;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 min-w-[180px] font-sans">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-sm font-black text-[#1d2d6a] uppercase">${train.name}</h3>
            <span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold">${train.id}</span>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between text-[10px]">
              <span class="text-slate-400 font-bold uppercase">Status</span>
              <span class="font-bold ${train.status === 'Normal' ? 'text-green-600' : 'text-amber-600'}">${train.status}</span>
            </div>
            <div class="flex justify-between text-[10px]">
              <span class="text-slate-400 font-bold uppercase">Speed</span>
              <span class="text-[#1d2d6a] font-bold">${train.speed} km/h</span>
            </div>
            <div class="flex justify-between text-[10px]">
              <span class="text-slate-400 font-bold uppercase">ETA</span>
              <span class="text-blue-600 font-bold">${train.eta}</span>
            </div>
          </div>
          <button class="w-full mt-3 py-1.5 bg-[#ee6f1f] text-white text-[9px] font-black uppercase rounded-lg hover:bg-[#d45d15] transition-colors">
            View Details
          </button>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(train.location)
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    if (trains.length > 0 && map.current) {
      // Optional: auto fit bounds or center on first train
      // map.current.setCenter(trains[0].location);
    }
  }, [trains]);

  return <div ref={mapContainer} className="w-full h-full rounded-2xl" />;
};

export default MapComponent;
