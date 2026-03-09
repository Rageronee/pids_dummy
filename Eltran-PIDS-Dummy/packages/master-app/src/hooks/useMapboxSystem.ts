import { useState, useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

export function useMapboxSystem(
    route: any,
    data: any,
    simGps: { lng: number; lat: number; heading: number },
    simGpsRef: React.MutableRefObject<{ lng: number; lat: number; heading: number }>,
    innerRadius: number,
    outerRadius: number
) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        const darkStyle: maplibregl.StyleSpecification = {
            version: 8,
            sources: {
                'carto-dark': {
                    type: 'raster',
                    tiles: [
                        'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                }
            },
            layers: [{
                id: 'carto-dark-layer',
                type: 'raster',
                source: 'carto-dark',
                minzoom: 0,
                maxzoom: 19
            }]
        };

        const initialCenterLng = simGpsRef.current.lng || 107.6036;
        const initialCenterLat = simGpsRef.current.lat || -6.9125;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: darkStyle,
            center: [initialCenterLng, initialCenterLat],
            zoom: 15,
            pitch: 45,
            attributionControl: false
        });

        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-[0_0_15px_rgba(238,111,31,0.8)]';
        const initialMapLng = simGpsRef.current.lng || 107.6036;
        const initialMapLat = simGpsRef.current.lat || -6.9125;
        markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([initialMapLng, initialMapLat])
            .addTo(map.current!);

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        }
    }, []);

    // Update map marker position
    useEffect(() => {
        if (!map.current || !markerRef.current) return;

        const lng = simGps.lng === 0 ? 107.6036 : simGps.lng;
        const lat = simGps.lat === 0 ? -6.9125 : simGps.lat;

        markerRef.current.setLngLat([lng, lat]);

        if (simGps.lng !== 0 && simGps.lat !== 0) {
            map.current.easeTo({
                center: [lng, lat],
                zoom: 15,
                duration: 1000
            });
        }
    }, [simGps]);

    // Handle GeoJSON changes
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (!route?.geojson) {
            const source = map.current.getSource('route-path');
            if (source) {
                if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
                if (map.current.getLayer('route-line-glow')) map.current.removeLayer('route-line-glow');
                if (map.current.getLayer('station-points')) map.current.removeLayer('station-points');
                map.current.removeSource('route-path');
            }
            return;
        }

        try {
            const geojson = typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson;

            const existingSource = map.current.getSource('route-path') as maplibregl.GeoJSONSource;

            if (existingSource) {
                existingSource.setData(geojson);
            } else {
                map.current?.addSource('route-path', {
                    type: 'geojson',
                    data: geojson
                });

                map.current?.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route-path',
                    paint: {
                        'line-color': '#1d2d6a',
                        'line-width': 6,
                        'line-opacity': 0.8
                    },
                    filter: ['==', '$type', 'LineString']
                });

                map.current?.addLayer({
                    id: 'route-line-glow',
                    type: 'line',
                    source: 'route-path',
                    paint: {
                        'line-color': '#ee6f1f',
                        'line-width': 2,
                        'line-opacity': 1
                    },
                    filter: ['==', '$type', 'LineString']
                });

                map.current?.addLayer({
                    id: 'station-points',
                    type: 'circle',
                    source: 'route-path',
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#ffffff',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ee6f1f'
                    },
                    filter: ['==', '$type', 'Point']
                });
            }

            if (!map.current.getSource('active-station-circles')) {
                map.current?.addSource('active-station-circles', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

                map.current?.addLayer({
                    id: 'active-station-outer',
                    type: 'fill',
                    source: 'active-station-circles',
                    filter: ['==', 'type', 'outer'],
                    paint: {
                        'fill-color': '#ee6f1f',
                        'fill-opacity': 0.1,
                        'fill-outline-color': '#ee6f1f'
                    }
                });

                map.current?.addLayer({
                    id: 'active-station-inner',
                    type: 'fill',
                    source: 'active-station-circles',
                    filter: ['==', 'type', 'inner'],
                    paint: {
                        'fill-color': '#ee6f1f',
                        'fill-opacity': 0.2,
                        'fill-outline-color': '#ee6f1f'
                    }
                });
            }

            const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);
            const lineStringFeature = features.find((f: any) => f.geometry?.type === 'LineString' || f.type === 'LineString');
            const coordinates = lineStringFeature?.geometry?.coordinates || lineStringFeature?.coordinates;

            if (coordinates && coordinates.length > 0) {
                if (!existingSource) {
                    const bounds = coordinates.reduce((bounds: maplibregl.LngLatBounds, coord: [number, number]) => {
                        return bounds.extend(coord);
                    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

                    if (!simGpsRef.current.lng) {
                        map.current?.fitBounds(bounds, { padding: 50, duration: 1000 });
                    }
                }
            }

        } catch (err) {
            console.error("Failed to render GeoJSON:", err);
        }
    }, [route?.geojson, mapLoaded]);

    // Update active station highlight circles
    useEffect(() => {
        if (!map.current || !route?.geojson || data?.currentStation === '-') {
            const source = map.current?.getSource('active-station-circles') as maplibregl.GeoJSONSource;
            if (source) source.setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        try {
            const geojson = typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson;
            const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);

            const currentStationClean = (data.currentStation || '').trim().toLowerCase();
            const stationFeature = features.find((f: any) => {
                if (f.geometry?.type !== 'Point') return false;
                const propName = (f.properties?.name || '').trim().toLowerCase();
                const propStationName = (f.properties?.station_name || '').trim().toLowerCase();
                return propName === currentStationClean || propStationName === currentStationClean;
            });

            if (stationFeature) {
                const center = stationFeature.geometry.coordinates;
                const innerRad = (innerRadius || 250) / 1000;
                const outerRad = (outerRadius || 750) / 1000;

                const innerCircle = turf.circle(center, innerRad, { steps: 64, units: 'kilometers', properties: { type: 'inner' } });
                const outerCircle = turf.circle(center, outerRad, { steps: 64, units: 'kilometers', properties: { type: 'outer' } });

                const source = map.current.getSource('active-station-circles') as maplibregl.GeoJSONSource;
                if (source) {
                    source.setData({
                        type: 'FeatureCollection',
                        features: [outerCircle, innerCircle]
                    });
                }
            } else {
                const source = map.current.getSource('active-station-circles') as maplibregl.GeoJSONSource;
                if (source) source.setData({ type: 'FeatureCollection', features: [] });
            }
        } catch (err) {
            console.error("Failed to update station highlight circles:", err);
        }
    }, [route?.geojson, data?.currentStation, innerRadius, outerRadius]);

    return {
        mapContainer,
        mapLoaded,
    };
}
