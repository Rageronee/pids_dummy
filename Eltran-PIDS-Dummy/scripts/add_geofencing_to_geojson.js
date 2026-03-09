const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const geojsonPath = path.join(__dirname, '../packages/master-app/public/geojson/argo_parahyangan.geojson');
const rawData = fs.readFileSync(geojsonPath, 'utf8');
const geojson = JSON.parse(rawData);

// Cimahi Station Coordinates (from argo_parahyangan.geojson point feature)
const cimahiCoords = [107.536692, -6.886529];
const innerRadius = 250; // meters
const outerRadius = 500; // meters

const centerPt = turf.point(cimahiCoords);

// Create Outer Circle (Blue-ish)
const outerCircle = turf.circle(centerPt, outerRadius, {
    steps: 64,
    units: 'meters',
    properties: {
        name: 'Cimahi Outer Geofence',
        type: 'geofence',
        radius: outerRadius,
        style: 'outer'
    }
});

// Create Inner Circle (Cyan-ish)
const innerCircle = turf.circle(centerPt, innerRadius, {
    steps: 64,
    units: 'meters',
    properties: {
        name: 'Cimahi Inner Geofence',
        type: 'geofence',
        radius: innerRadius,
        style: 'inner'
    }
});

// Add to features
geojson.features.push(outerCircle);
geojson.features.push(innerCircle);

// Save back
fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));

console.log('Successfully added Cimahi geofencing circles to argo_parahyangan.geojson');
