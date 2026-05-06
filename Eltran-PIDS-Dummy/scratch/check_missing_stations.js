
const fs = require('fs');
const schedules = JSON.parse(fs.readFileSync('packages/master-app/electron/schedules_data.json', 'utf-8'));
const stations = JSON.parse(fs.readFileSync('packages/shared/data/stations_master.json', 'utf-8'));

const stationNames = new Set(stations.map(s => s.name.toUpperCase()));
const missing = new Set();

schedules.forEach(t => {
    t.stops.forEach(s => {
        if (!stationNames.has(s.name.toUpperCase())) {
            missing.add(s.name);
        }
    });
});

console.log('Missing stations count:', missing.size);
console.log('Sample missing:', Array.from(missing).slice(0, 10));
