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
  heading?: number;
}

interface MapComponentProps {
  trains?: TrainMarker[];
  onAnalyze?: (trainId: string) => void;
  focusCoord?: [number, number] | null;
  routeLine?: [number, number][];
  onMapClick?: () => void;
  onTrainClick?: (trainId: string, location: [number, number]) => void;
}

const isValidCoord = (coord: [number, number]): boolean => {
  const [lng, lat] = coord;
  return (
    !isNaN(lng) && !isNaN(lat) &&
    isFinite(lng) && isFinite(lat) &&
    !(lng === 0 && lat === 0) &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  );
};

const MapComponent: React.FC<MapComponentProps> = ({ trains = [], onAnalyze, focusCoord, routeLine, onMapClick, onTrainClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const popups = useRef<Record<string, maplibregl.Popup>>({});
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const hasFittedToTrains = useRef(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    const isDarkMode = document.documentElement.classList.contains("dark");
    
    const style: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "carto-tiles": {
          type: "raster",
          tiles: [
            isDarkMode 
              ? "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png"
              : "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
          ],
          tileSize: 256,
          attribution: '&copy; CARTO',
        },
      },
      layers: [{ id: "carto-tiles-layer", type: "raster", source: "carto-tiles" }],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style,
      center: [107.6098, -6.9147],
      zoom: 8,
      pitch: 0,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.on('click', (e) => {
      const features = map.current?.queryRenderedFeatures(e.point);
      if (!features?.length) {
        onMapClick?.();
      }
    });

    map.current.on('zoom', () => {
      const z = map.current?.getZoom() || 8;
      // Proportional scale: small when zoom out, large when zoom in
      const scale = Math.max(0.4, Math.min(1.8, 0.4 + (z / 15)));
      document.documentElement.style.setProperty('--map-marker-scale', scale.toString());
    });

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (map.current && map.current.isStyleLoaded()) {
        const newTiles = isDark 
          ? "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png"
          : "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";
        // @ts-ignore
        map.current.getSource("carto-tiles")?.setTiles([newTiles]);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const lastFocusedCoord = useRef<string | null>(null);

  useEffect(() => {
    if (focusCoord && map.current && mapLoaded && isValidCoord(focusCoord)) {
      const coordKey = `${focusCoord[0].toFixed(5)},${focusCoord[1].toFixed(5)}`;
      if (lastFocusedCoord.current === coordKey) return;
      
      lastFocusedCoord.current = coordKey;
      map.current.flyTo({
        center: focusCoord,
        zoom: 14,
        essential: true,
        duration: 2000
      });
    }
  }, [focusCoord, mapLoaded]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !currentMap.isStyleLoaded()) return;

    if (routeLine && routeLine.length > 1) {
      if (!currentMap.getSource("route-line")) {
        currentMap.addSource("route-line", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: routeLine,
            },
          },
        });
        currentMap.addLayer({
          id: "route-line-layer",
          type: "line",
          source: "route-line",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#ee6f1f",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });
      } else {
        // @ts-ignore
        currentMap.getSource("route-line")?.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeLine,
          },
        });
      }

      // Fit bounds only once per route change
      const routeId = routeLine.map(c => c.join(',')).join('|');
      // @ts-ignore
      if (currentMap._lastRouteId !== routeId) {
        // @ts-ignore
        currentMap._lastRouteId = routeId;
        const bounds = new maplibregl.LngLatBounds(routeLine[0], routeLine[0]);
        for (const coord of routeLine) {
          bounds.extend(coord);
        }
        currentMap.fitBounds(bounds, { padding: 50, duration: 2000 });
      }
    } else {
      if (currentMap.getLayer("route-line-layer")) {
        currentMap.removeLayer("route-line-layer");
      }
      if (currentMap.getSource("route-line")) {
        currentMap.removeSource("route-line");
      }
    }
  }, [routeLine, mapLoaded]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !currentMap.isStyleLoaded()) return;

    const validTrains = trains.filter(t => isValidCoord(t.location));
    const trainIds = validTrains.map(t => t.id);
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

    // Auto focus logic: trigger only once when first valid trains are available
    if (!hasFittedToTrains.current && validTrains.length > 0 && !focusCoord) {
      hasFittedToTrains.current = true;
      if (validTrains.length === 1) {
        currentMap.flyTo({ center: validTrains[0].location, zoom: 13, duration: 1500 });
      } else {
        const bounds = new maplibregl.LngLatBounds(validTrains[0].location, validTrains[0].location);
        validTrains.forEach(t => bounds.extend(t.location));
        currentMap.fitBounds(bounds, { padding: 60, duration: 1500 });
      }
    }

    validTrains.forEach(train => {
      if (markers.current[train.id]) {
        markers.current[train.id].setLngLat(train.location);
        return;
      }

      const el = document.createElement("div");
      el.className = "relative group cursor-pointer flex flex-col items-center justify-end";
      el.style.width = '48px';
      el.style.height = '64px';
      el.innerHTML = `
        <div class="relative flex flex-col items-center justify-end w-full h-full">
          <div class="absolute left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-white/20 text-[9px] font-black text-white whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-50 uppercase tracking-widest pointer-events-none -translate-y-full" style="top: 10px;">
            ${train.name}
          </div>
          
          <div class="relative flex flex-col items-center marker-pin-wrapper" style="transform: scale(var(--map-marker-scale, 1)); transform-origin: center bottom;">
            <div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping" style="top: -10px; left: 50%; margin-left: -24px;"></div>
            <div class="w-7 h-7 bg-blue-600 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center relative z-10">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
            <div class="w-0 h-0 -mt-1 relative z-10" style="border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid #2563eb;"></div>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onTrainClick?.(train.id, train.location);
      });

      const popupContent = `
        <div id="popup-${train.id}" class="p-0 overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-slate-800 font-sans min-w-[240px] max-w-[300px] scale-100 pointer-events-auto">
          <div class="bg-[#1d2d6a] dark:bg-[#020617] p-5 text-white relative">
            <button id="close-popup-${train.id}" class="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 z-[70] cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="flex flex-col mb-1">
              <span class="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">Fleet Monitor</span>
              <h3 class="text-lg font-black uppercase tracking-tighter leading-none pr-8">${train.name}</h3>
            </div>
            <span class="inline-block mt-2 text-[9px] font-mono font-bold bg-[#ee6f1f] px-3 py-1 rounded text-white shadow-sm uppercase">${train.id}</span>
          </div>

          <div class="p-5 space-y-5 bg-white dark:bg-transparent">
            <div class="flex justify-between items-center gap-6">
              <div class="space-y-1">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">System Status</p>
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full ${train.status === 'Normal' || train.status === 'Beroperasi' || train.status === 'STANDBY' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse"></div>
                  <span class="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">${train.status}</span>
                </div>
              </div>
              <div class="space-y-1 text-right">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Velocity</p>
                <p class="text-[11px] font-black text-[#ee6f1f] uppercase">${train.speed} <span class="text-[9px] opacity-60">KM/H</span></p>
              </div>
            </div>

            <div class="h-px bg-slate-100 dark:border-slate-800"></div>

            <div class="space-y-1">
              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Next Checkpoint</p>
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Station Arrival</span>
                <span class="text-sm font-black text-[#1d2d6a] dark:text-blue-400 font-mono">${train.eta || '--:--'}</span>
              </div>
            </div>

            <button id="btn-analyze-${train.id}" class="w-full py-3 bg-[#ee6f1f] hover:bg-[#d45d15] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-orange-500/20 active:scale-95 cursor-pointer">
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
        closeOnClick: true,
      }).setHTML(popupContent);

      popup.on('open', () => {
        const analyzeBtn = document.getElementById(`btn-analyze-${train.id}`);
        const closeBtn = document.getElementById(`close-popup-${train.id}`);

        if (analyzeBtn) {
          analyzeBtn.onclick = (e) => {
             e.preventDefault();
             e.stopPropagation();
             onAnalyze?.(train.id);
          };
        }

        if (closeBtn) {
          closeBtn.onclick = (e) => {
             e.preventDefault();
             e.stopPropagation();
             markers.current[train.id].getPopup().remove();
          };
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(train.location)
        .setPopup(popup)
        .addTo(currentMap);

      markers.current[train.id] = marker;
      popups.current[train.id] = popup;
    });
  }, [trains, onAnalyze, onTrainClick, mapLoaded]);

  const toggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={mapWrapperRef} className="w-full h-full relative rounded-2xl group">
      <style>{`
        .custom-pids-map-popup .maplibregl-popup-content {
          padding: 0;
          background: transparent;
          box-shadow: none;
          border-radius: 32px;
          transform: scale(1) !important; /* Ensure popup doesn't scale with zoom */
        }
        .custom-pids-map-popup .maplibregl-popup-tip {
          display: none;
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full rounded-2xl" />
      <button 
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-10 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-slate-600 dark:text-slate-300 hover:text-[#1d2d6a] dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
    </div>
  );
};

export default MapComponent;
