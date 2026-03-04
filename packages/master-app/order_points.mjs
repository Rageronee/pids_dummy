import fs from 'fs';
import * as turf from '@turf/turf';

const geojsonStr = fs.readFileSync('public/geojson/malabar.geojson', 'utf8');
const geojson = JSON.parse(geojsonStr);

const line = geojson.features.find(f => f.geometry.type === 'LineString');
const points = geojson.features.filter(f => f.geometry.type === 'Point');

for (let p of points) {
    const snapped = turf.nearestPointOnLine(line, p, { units: 'kilometers' });
    p.properties.distanceAlongLine = snapped.properties.location || 0;
}

// Distance along line from start node (Malang -> Bandung)
points.sort((a, b) => a.properties.distanceAlongLine - b.properties.distanceAlongLine);

// Print to verify
console.log("Points ordered by distance (from start to end):");
points.forEach(p => console.log(p.properties.name, p.properties.distanceAlongLine));

// If we want it from Bandung to Malang, we should check what's start and end.
const firstPt = points[0].properties.name;
if (firstPt.toLowerCase().includes('malang')) {
    console.log("Path goes from Malang -> Bandung. Reversing to match Bandung -> Malang since ARGO WILIS & MALABAR start in BD?");
    // The default DB seeds show 'MALABAR': ['BD', 'TSM', 'YK', 'SLO', 'MN', 'KD', 'BL', 'ML']
    points.reverse();

    // Also reverse linestring so trains run the correct way?
    line.geometry.coordinates.reverse();
}

console.log("Final Order:");
points.forEach((p, idx) => console.log(idx + 1, p.properties.name));

for (let p of points) {
    delete p.properties.distanceAlongLine;
}

geojson.features = [line, ...points];
fs.writeFileSync('public/geojson/malabar.geojson', JSON.stringify(geojson, null, 2));
console.log("Ordered geojson points successfully!");
