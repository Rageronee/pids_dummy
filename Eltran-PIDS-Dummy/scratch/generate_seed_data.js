
const fs = require('fs');

const schedules = JSON.parse(fs.readFileSync('packages/master-app/electron/schedules_data.json', 'utf-8'));
const masterStations = JSON.parse(fs.readFileSync('packages/shared/data/stations_master.json', 'utf-8'));
const geojson = JSON.parse(fs.readFileSync('packages/master-app/public/geojson/Malabar/Malabar.geojson', 'utf-8'));

const stationMap = new Map();
// Load master stations first (they have real codes)
masterStations.forEach(s => {
    stationMap.set(s.name.toUpperCase(), {
        ...s,
        id: s.code // Use code as ID
    });
});

// Add stations from GeoJSON if missing
geojson.features.forEach(f => {
    if (f.geometry.type === 'Point' && f.properties.name) {
        const name = f.properties.name.toUpperCase();
        if (!stationMap.has(name)) {
            stationMap.set(name, {
                id: f.properties.code || name, // Use code or full name as ID
                code: f.properties.code || name.substring(0, 5),
                name: f.properties.name,
                city: f.properties.city || '',
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            });
        }
    }
});

// Collect all stations from schedules
schedules.forEach(t => {
    t.stops.forEach(s => {
        const name = s.name.toUpperCase();
        if (!stationMap.has(name)) {
            stationMap.set(name, {
                id: name, // Use name as ID to ensure uniqueness
                code: name.substring(0, 5),
                name: s.name,
                city: '',
                lat: 0,
                lng: 0
            });
        }
    });
});

const allStations = Array.from(stationMap.values());

// Prepare Routes
const ka67 = schedules.find(t => t.number === 'KA 67');
const routeGoStops = ka67.stops.map(s => s.name);

const ka68 = schedules.find(t => t.number === 'KA 68');
const routeBackStops = ka68.stops.map(s => s.name);

const finalData = {
    stations: allStations,
    routes: [
        { name: 'MALABAR_GO', serviceName: 'MALABAR', direction: 'Malang - Bandung', stations: routeGoStops },
        { name: 'MALABAR_BACK', serviceName: 'MALABAR', direction: 'Bandung - Malang', stations: routeBackStops }
    ],
    schedules: schedules.map(t => ({
        trainNumber: t.number.replace('KA ', ''),
        serviceName: 'MALABAR',
        routeName: (t.number === 'KA 67' || t.number === 'KA 69') ? 'MALABAR_GO' : 'MALABAR_BACK',
        stops: t.stops
    }))
};

fs.writeFileSync('packages/master-app/electron/seed_data.json', JSON.stringify(finalData, null, 2));
console.log('Final seed data regenerated with unique IDs.');
