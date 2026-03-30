import fs from 'fs';
import path from 'path';

const dir = 'f:/Muhammad Afnan Risandi/02_Projects/Learning/Magang/Eltran/PIDS/Dummy/Eltran-PIDS-Dummy/packages/master-app/public/geojson/Malabar';
const geojsonPath = path.join(dir, 'Malabar.geojson');
const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

const files = ['67.txt', '68.txt', '69.txt', '70.txt'];
const schedules = {};

files.forEach(file => {
    const kaStr = 'ka' + file.replace('.txt', '');
    schedules[kaStr] = { origin: null, stations: {} };
    
    const lines = fs.readFileSync(path.join(dir, file), 'utf-8').split('\n').map(l => l.trim());
    let currentStation = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        if (line === 'Origin') {
            schedules[kaStr].origin = currentStation;
        } else if (line === 'Destination' || line === 'Transit station') {
            // Context logic
        } else if (line.startsWith('Arr ') || line.startsWith('Dep ')) {
            const time = line.split(' ')[1].substring(0, 5); // HH:MM
            if (currentStation) {
                if (!schedules[kaStr].stations[currentStation]) {
                    schedules[kaStr].stations[currentStation] = time;
                } else if (line.startsWith('Dep ')) {
                    schedules[kaStr].stations[currentStation] = time; // Prefer departure
                }
            }
        } else if (!line.startsWith('Note:') && !line.startsWith('Train') && !line.startsWith('KA ')) {
            // It's a station name
            currentStation = line;
        }
    }
});

// Update GeoJSON features
geojson.features.forEach(f => {
    const stationName = String(f.properties?.name || '').toUpperCase().trim();
    if (!stationName) return;

    ['ka67', 'ka68', 'ka69', 'ka70'].forEach(ka => {
        // Strip out old properties for clean re-insertion
        delete f.properties[`schedule_${ka}`];
        delete f.properties[`is_origin_${ka}`];

        const sched = schedules[ka];
        if (!sched) return;

        // Find the matched station key in the text file
        const matchKey = Object.keys(sched.stations).find(k => k.toUpperCase().trim() === stationName);
        if (matchKey) {
            f.properties[`schedule_${ka}`] = sched.stations[matchKey];
        }

        // Set origin flag
        if (sched.origin && sched.origin.toUpperCase().trim() === stationName) {
            f.properties[`is_origin_${ka}`] = true;
        }
    });
});

fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 4));
console.log('Successfully updated Malabar.geojson with origin and schedules from txt files.');
