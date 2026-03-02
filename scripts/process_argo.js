const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('argo_raw.json', 'utf8'));

// The Overpass API result returns elements.
// The relation is the first element with type === 'relation'
const relation = raw.elements.find(e => e.type === 'relation' && e.tags && e.tags.name && e.tags.name.includes('Argo Parahyangan'));

if (!relation) {
    console.error('Relation not found');
    process.exit(1);
}

let multiCoords = [];
for (const member of relation.members) {
    if (member.type === 'way' && member.geometry) {
        let wayCoords = [];
        member.geometry.forEach(point => {
            wayCoords.push([point.lon, point.lat]);
        });
        if (wayCoords.length > 0) multiCoords.push(wayCoords);
    }
}

const geojson = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: { ...relation.tags, name: "Argo Parahyangan Route" },
            geometry: {
                type: "MultiLineString",
                coordinates: multiCoords
            }
        }
    ]
};

// Now process the stations. 
// Stations are typically nodes in the elements array (since we requested node(r); out body;)
const nodes = raw.elements.filter(e => e.type === 'node');

let stationCount = 0;
for (const node of nodes) {
    // some nodes might not have tags if they are just geometry, but we requested 'out body' which includes tags if any.
    // we only care about nodes that are named stations/stops in the relation members, 
    // or just any node returned by node(r) that has a name since they are part of the train route relation as stops.
    const isMember = relation.members.find(m => m.type === 'node' && m.ref === node.id);
    if (isMember && node.tags && node.tags.name) {
        geojson.features.push({
            type: "Feature",
            properties: { ...node.tags, isCheckpoint: true, role: isMember.role },
            geometry: {
                type: "Point",
                coordinates: [node.lon, node.lat]
            }
        });
        stationCount++;
    }
}

fs.writeFileSync('../packages/master-app/public/geojson/argo_parahyangan.geojson', JSON.stringify(geojson, null, 2));
console.log('GeoJSON successfully generated with MultiLineString and ' + stationCount + ' stations.');
