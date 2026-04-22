/** /command-center-app/src/components/MapComponent.tsx — untuk mengubah: komponen PIDS; fungsi utama: MapComponent */

import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

interface TrainMarker {
  id: string;
  name: string;
  location: [number, number]; // [lng, lat]
  status: string;
  speed: number;
  eta: string;
}

interface MapComponentProps {
  trains?: TrainMarker[];
  onAnalyze?: (trainId: string) => void;
  focusCoord?: [number, number] | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ trains = [], onAnalyze, focusCoord }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const popups = useRef<Record<string, maplibregl.Popup>>({});

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
      layers: [{ id: "carto-voyager-layer", type: "raster", source: "carto-voyager" }],
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
    if (focusCoord && map.current) {
      map.current.flyTo({
        center: focusCoord,
        zoom: 14,
        essential: true,
        duration: 2000
      });
    }
  }, [focusCoord]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    const trainIds = trains.map(t => t.id);
    Object.keys(markers.current).forEach(id => {
      if (!trainIds.includes(id)) {
        markers.current[id].remove();
        delete markers.current[id];
        if (popups.current[id]) {
          popups.current[id].remove();
          delete popups.current[id];
        }
      }
    });

    trains.forEach(train => {
      if (markers.current[train.id]) {
        markers.current[train.id].setLngLat(train.location);
        return;
      }

      const el = document.createElement("div");
      el.className = "relative group cursor-pointer flex items-center justify-center";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-blue-500 opacity-20 rounded-full animate-ping"></div>
          <div class="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center z-10 transition-transform group-hover:scale-125">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#1d2d6a] dark:bg-black px-2 py-0.5 rounded border border-white/10 text-[8px] font-black text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 uppercase tracking-widest">
            ${train.name}
          </div>
        </div>
      `;

      const popupContent = `
        <div id="popup-${train.id}" class="p-0 overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-slate-800 font-sans min-w-[220px] max-w-[280px]">
          <div class="bg-[#1d2d6a] dark:bg-[#020617] p-4 text-white relative">
            <button id="close-popup-${train.id}" class="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="flex flex-col mb-0.5">
              <span class="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">Fleet Monitor</span>
              <h3 class="text-base font-black uppercase tracking-tighter leading-none pr-6">${train.name}</h3>
            </div>
            <span class="inline-block mt-2 text-[8px] font-mono font-bold bg-[#ee6f1f] px-2 py-0.5 rounded text-white shadow-sm">${train.id}</span>
          </div>

          <div class="p-4 space-y-4 bg-white dark:bg-slate-900">
            <div class="flex justify-between items-center gap-4">
              <div class="space-y-0.5">
                <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full ${train.status === 'Normal' || train.status === 'STANDBY' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse"></div>
                  <span class="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase">${train.status}</span>
                </div>
              </div>
              <div class="space-y-0.5 text-right">
                <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">Speed</p>
                <p class="text-[10px] font-black text-[#ee6f1f]">${train.speed} <span class="text-[8px] opacity-60">KM/H</span></p>
              </div>
            </div>

            <div class="h-px bg-slate-100 dark:bg-slate-800"></div>

            <div class="space-y-0.5">
              <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">Next Arrival</p>
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[100px]">Station ETA</span>
                <span class="text-xs font-black text-[#1d2d6a] dark:text-blue-400 font-mono">${train.eta || '--:--'}</span>
              </div>
            </div>

            <button id="btn-analyze-${train.id}" class="w-full py-2.5 bg-[#ee6f1f] hover:bg-[#d45d15] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95">
              Analyze Data
            </button>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: 'none',
        className: 'custom-pids-map-popup',
        closeOnClick: false,
        anchor: undefined
      }).setHTML(popupContent);

      popup.on('open', () => {
        const analyzeBtn = document.getElementById(`btn-analyze-${train.id}`);
        const closeBtn = document.getElementById(`close-popup-${train.id}`);

        analyzeBtn?.addEventListener('click', (e) => {
           e.stopPropagation();
           onAnalyze?.(train.id);
        });

        closeBtn?.addEventListener('click', (e) => {
           e.stopPropagation();
           popup.remove();
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(train.location)
        .setPopup(popup)
        .addTo(currentMap);

      markers.current[train.id] = marker;
      popups.current[train.id] = popup;
    });
  }, [trains, onAnalyze]);

  return (
    <>
      <style>{`
        .custom-pids-map-popup .maplibregl-popup-content {
          padding: 0;
          background: transparent;
          box-shadow: none;
          border-radius: 32px;
        }
        .custom-pids-map-popup .maplibregl-popup-tip {
          display: none;
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full rounded-2xl" />
    </>
  );
};

export default MapComponent;
