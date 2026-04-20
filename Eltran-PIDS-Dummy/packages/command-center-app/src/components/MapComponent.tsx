/**
 * Ringkasan: command-center-app\src\components\MapComponent.tsx
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const MapComponent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Dark style matching Carto Dark
    const darkStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'carto-light': {
          type: 'raster',
          tiles: [
            'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        }
      },
      layers: [{
        id: 'carto-light-layer',
        type: 'raster',
        source: 'carto-light',
        minzoom: 0,
        maxzoom: 19
      }]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: darkStyle,
      center: [106.8272, -6.1751], // Default to Jakarta
      zoom: 12,
      pitch: 45,
      attributionControl: false
    });

    // Add a simple marker for the "Command Center" node (simulated)
    const el = document.createElement('div');
    el.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse';
    
    new maplibregl.Marker({ element: el })
      .setLngLat([106.8272, -6.1751])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div ref={mapContainer} className="w-full h-full rounded-2xl" />
  );
};

export default MapComponent;

