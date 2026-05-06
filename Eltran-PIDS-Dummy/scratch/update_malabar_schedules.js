const fs = require('fs');
const path = require('path');

const txtPath = 'f:/Muhammad Afnan Risandi/02_Projects/Learning/Magang/Eltran/PIDS/Dummy/Jadwal kereta.txt';
const geojsonPath = 'f:/Muhammad Afnan Risandi/02_Projects/Learning/Magang/Eltran/PIDS/Dummy/Eltran-PIDS-Dummy/packages/master-app/public/geojson/Malabar/Malabar.geojson';

function parseSchedules() {
    const content = fs.readFileSync(txtPath, 'utf8');
    const lines = content.split(/\r?\n/).map(l => l.trim());
    const schedules = {};

    let currentKa = '';
    let currentStation = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('KA ')) {
            currentKa = line.toLowerCase().replace(' ', ''); // ka67, ka68, etc
            continue;
        }

        if (line === 'Origin' || line === 'Transit station' || line === 'Destination') {
            currentStation = lines[i-1];
            if (!schedules[currentStation]) schedules[currentStation] = {};
            
            // Look ahead for times
            let j = i + 1;
            let foundTime = false;
            while (j < lines.length && j < i + 15) {
                const nextLine = lines[j];
                if (nextLine.startsWith('KA ')) break;
                if (nextLine === 'Origin' || nextLine === 'Transit station' || nextLine === 'Destination') break;

                const timeMatch = nextLine.match(/(?:Arr|Dep)\s+(\d{2}:\d{2})/);
                if (timeMatch) {
                    const time = timeMatch[1];
                    // We prefer Arrival time if both present, or first one found
                    if (!schedules[currentStation][currentKa]) {
                        schedules[currentStation][currentKa] = time;
                    } else if (nextLine.startsWith('Arr')) {
                        // Override with arrival if we previously picked departure
                        schedules[currentStation][currentKa] = time;
                    }
                    foundTime = true;
                }
                j++;
            }
        }
    }
    return schedules;
}

const officialSchedules = parseSchedules();
console.log('Parsed schedules for', Object.keys(officialSchedules).length, 'stations.');

const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

let updatedCount = 0;
geojson.features.forEach(feature => {
    if (feature.geometry.type === 'Point' && feature.properties.name) {
        const name = feature.properties.name;
        const normalizedName = name.trim();
        
        // Try exact match
        let schedule = officialSchedules[normalizedName];
        
        // Try partial match if not found (e.g. "Malang" vs "Malang (ML)")
        if (!schedule) {
            const key = Object.keys(officialSchedules).find(k => 
                k.toUpperCase().includes(normalizedName.toUpperCase()) || 
                normalizedName.toUpperCase().includes(k.toUpperCase())
            );
            if (key) schedule = officialSchedules[key];
        }

        if (schedule) {
            for (const [ka, time] of Object.entries(schedule)) {
                feature.properties[`schedule_${ka}`] = time;
            }
            updatedCount++;
        } else {
            console.warn('No schedule found for station:', name);
        }
    }
});

fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));
console.log('Successfully updated', updatedCount, 'stations in GeoJSON.');
