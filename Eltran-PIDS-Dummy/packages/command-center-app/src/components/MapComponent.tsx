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
  const userInteracted = useRef(false);

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
      center: [118.0, -2.5], // Centered on Indonesia
      zoom: 4.5,
      pitch: 45,
      bearing: 0,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);

      // Orbital seamless slow effect (Ultra-slow for cinematic feel)
      let bearing = 0;
      let direction = 1;
      const rotateMap = () => {
        if (!map.current) return;
        if (!userInteracted.current) {
          bearing += 0.005 * direction;
          if (bearing >= 90) {
            direction = -1;
          } else if (bearing <= -90) {
            direction = 1;
          }
          map.current.setBearing(bearing);
        }
        requestAnimationFrame(rotateMap);
      };

      // Start orbital effect after a small delay
      setTimeout(rotateMap, 100);
    });

    map.current.on('click', (e) => {
      const features = map.current?.queryRenderedFeatures(e.point);
      if (!features?.length) {
        onMapClick?.();
      }
    });

    map.current.on('zoom', () => {
      const z = map.current?.getZoom() || 8;
      // Proportional scale: small when zoom out, large when zoom in (Clamped for stability)
      const scale = Math.max(0.6, Math.min(1.4, 0.4 + (z / 18)));
      document.documentElement.style.setProperty('--map-marker-scale', scale.toString());

      // Dynamic label styling based on zoom
      const labelOffset = Math.max(-28, -12 - (z * 1.8));
      const labelFontSize = Math.max(8, Math.min(11, 6 + (z / 2)));
      document.documentElement.style.setProperty('--map-label-offset', `${labelOffset}px`);
      document.documentElement.style.setProperty('--map-label-font-size', `${labelFontSize}px`);
    });

    // Handle map movement to stop orbital rotation if user interacts
    let rotationTimeout: NodeJS.Timeout;
    const stopRotation = () => {
      userInteracted.current = true;
      clearTimeout(rotationTimeout);
      rotationTimeout = setTimeout(() => {
        userInteracted.current = false;
      }, 5000); // Resume after 5s of inactivity
    };

    // Use specific user events instead of 'movestart' to avoid recursive stopping from setBearing
    map.current.on('dragstart', stopRotation);
    map.current.on('wheel', stopRotation);
    map.current.on('touchstart', stopRotation);

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
      clearTimeout(rotationTimeout);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Use a flag to track if we should allow auto-focus
  const allowAutoFocus = useRef(false);
  const lastFocusedCoord = useRef<string | null>(null);

  useEffect(() => {
    // Only allow auto-focus after the first few seconds or after a user selects a train
    if (!allowAutoFocus.current && focusCoord) {
      allowAutoFocus.current = true;
      return; // Skip the very first flyTo on mount if it's already focused
    }

    if (focusCoord && map.current && mapLoaded && isValidCoord(focusCoord)) {
      const coordKey = `${focusCoord[0].toFixed(5)},${focusCoord[1].toFixed(5)}`;
      if (lastFocusedCoord.current === coordKey) return;

      lastFocusedCoord.current = coordKey;
      
      // Programmatic movement should pause auto-rotation to prevent conflicts
      userInteracted.current = true;
      
      map.current.flyTo({
        center: focusCoord,
        zoom: 14,
        essential: true,
        duration: 2000
      });

      // Resume auto-rotation after movement is likely finished
      setTimeout(() => {
        userInteracted.current = false;
      }, 5000);
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

    // Remove stale markers
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

    // Auto focus logic: Disabled as per request to keep Indonesia view on initial load
    // Only focus if focusCoord prop is explicitly provided via DashboardPage
    /*
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
    */

    validTrains.forEach(train => {
      // If marker already exists, just update position
      if (markers.current[train.id]) {
        markers.current[train.id].setLngLat(train.location);
        return;
      }

      // Sanitize ID for safe DOM usage (remove spaces/special chars)
      const safeId = train.id.replace(/[^a-zA-Z0-9]/g, '-');

      const el = document.createElement("div");
      // Use pointer-events-none on the container so only the pin responds to hover/click
      el.className = "relative pointer-events-none flex flex-col items-center justify-end";
      el.style.width = '120px';
      el.style.height = '120px';

      el.innerHTML = `
        <div class="relative flex flex-col items-center justify-end w-full h-full">
          <!-- Premium Label (Targeted Reveal) -->
          <div id="label-${safeId}" class="absolute left-1/2 -translate-x-1/2 bg-[#1d2d6a] dark:bg-slate-950 px-4 py-2 rounded-xl border border-white/20 font-bold text-white whitespace-nowrap shadow-[0_15px_40px_rgba(0,0,0,0.4)] z-50 uppercase tracking-tighter opacity-0 scale-90 pointer-events-none transition-all duration-300" style="bottom: var(--map-label-offset, -40px); font-size: var(--map-label-font-size, 10px);">
            <div>${train.name}</div>
          </div>
          
          <!-- Modern Marker (The only part with pointer-events-auto) -->
          <div id="marker-pin-${safeId}" class="relative flex flex-col items-center pointer-events-auto cursor-pointer" style="transform: scale(var(--map-marker-scale, 1)); transform-origin: center bottom;">
            <div id="pin-icon-${safeId}" class="w-10 h-10 bg-[#1d2d6a] dark:bg-blue-600 rounded-2xl border-[3px] border-white dark:border-slate-800 shadow-2xl flex items-center justify-center relative z-10 transition-all duration-500">
              <div class="transition-all duration-500 text-white">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>
                </svg>
              </div>
            </div>
            
            <!-- Pin Tail -->
            <div class="w-2 h-4 bg-[#1d2d6a] dark:bg-blue-600 -mt-1.5 rounded-full relative z-0"></div>
          </div>
        </div>
      `;

      // Manual hover listeners for absolute precision
      const pinEl = el.querySelector(`#marker-pin-${safeId}`) as HTMLElement;
      const labelEl = el.querySelector(`#label-${safeId}`) as HTMLElement;
      const iconEl = el.querySelector(`#pin-icon-${safeId}`) as HTMLElement;

      if (pinEl && labelEl && iconEl) {
        pinEl.onmouseenter = () => {
          labelEl.classList.remove('opacity-0', 'scale-90');
          labelEl.classList.add('opacity-100', 'scale-110');
          iconEl.classList.add('scale-110');
        };
        pinEl.onmouseleave = () => {
          labelEl.classList.remove('opacity-100', 'scale-110');
          labelEl.classList.add('opacity-0', 'scale-90');
          iconEl.classList.remove('scale-110');
        };
      }

      el.addEventListener('click', (e) => {
        // Stop propagation to prevent map click from firing and immediately closing the route
        e.stopPropagation();

        // Auto zoom on click
        map.current?.flyTo({
          center: train.location,
          zoom: 14,
          speed: 1.2,
          curve: 1.42,
          essential: true
        });

        // Explicitly open the popup
        if (markers.current[train.id] && !markers.current[train.id].getPopup().isOpen()) {
          markers.current[train.id].togglePopup();
        }

        onTrainClick?.(train.id, train.location);
      });

      const popupContent = `
        <div id="popup-${train.id}" class="p-0 overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 font-sans min-w-[220px] max-w-[260px] pointer-events-auto">
          <div class="bg-[#1d2d6a] dark:bg-[#020617] px-4 py-3 text-white relative">
            <button id="close-popup-${train.id}" class="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 z-[70] cursor-pointer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="flex flex-col">
              <span class="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50 mb-0.5">Fleet Node</span>
              <h3 class="text-sm font-bold uppercase tracking-tight leading-none truncate pr-6">${train.name}</h3>
            </div>
          </div>

          <div class="p-4 space-y-3.5 bg-white dark:bg-transparent">
            <div class="flex justify-between items-center">
              <div class="space-y-0.5">
                <p class="text-[7px] font-semibold text-slate-400 uppercase tracking-widest">Status</p>
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full ${train.status === 'Normal' || train.status === 'Beroperasi' || train.status === 'STANDBY' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse"></div>
                  <span class="text-[10px] font-semibold text-slate-800 dark:text-slate-200 uppercase">${train.status}</span>
                </div>
              </div>
              <div class="text-right space-y-0.5">
                <p class="text-[7px] font-semibold text-slate-400 uppercase tracking-widest">Speed</p>
                <p class="text-[10px] font-semibold text-[#ee6f1f] uppercase">${train.speed} <span class="text-[8px] opacity-60">KM/H</span></p>
              </div>
            </div>

            <div class="h-px bg-slate-100 dark:bg-slate-800"></div>

            <div class="flex justify-between items-end">
              <div class="space-y-0.5">
                <p class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Next Arrival</p>
                <span class="text-xs font-bold text-[#1d2d6a] dark:text-blue-400 font-mono">${train.eta || '--:--'}</span>
              </div>
              <button id="btn-analyze-${train.id}" class="px-3 py-2 bg-[#ee6f1f] hover:bg-[#d45d15] text-[9px] font-bold uppercase tracking-widest text-white rounded-lg transition-all shadow-lg shadow-orange-500/10 active:scale-95 cursor-pointer">
                Details
              </button>
            </div>
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
  }, [trains, onAnalyze, onTrainClick, mapLoaded, focusCoord]);

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
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
  );
};

export default MapComponent;
