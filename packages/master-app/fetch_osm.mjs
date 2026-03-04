import fs from 'fs';
import * as turf from '@turf/turf';

const query = `
[out:json];
relation["route"="train"]["wikidata"="Q12491164"];
out geom;
`;

async function main() {
    console.log('Fetching from Overpass...');
    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
    });
    const data = await res.json();

    // extract ways from relation
    let relation = data.elements.find(e => e.type === 'relation');
    if (!relation) {
        console.error('No relation found');
        return;
    }

    console.log('Relation name:', relation.tags.name);

    // get members
    let lines = [];
    for (let member of relation.members) {
        if (member.type === 'way' && member.geometry) {
            let coords = member.geometry.map(p => [p.lon, p.lat]);
            lines.push(turf.lineString(coords));
        }
    }

    // Use turf to combine lines into a single multiline string, or just keep them
    // Then we can flatten or join matching endpoints.

    // A simple algorithm to join ways into a contiguous LineString
    let joinedCoords = [...lines[0].geometry.coordinates];
    lines.splice(0, 1);

    let iterations = 0;
    while (lines.length > 0 && iterations < 1000) {
        iterations++;
        let first = joinedCoords[0];
        let last = joinedCoords[joinedCoords.length - 1];

        let found = false;
        for (let i = 0; i < lines.length; i++) {
            let c = lines[i].geometry.coordinates;
            let w_first = c[0];
            let w_last = c[c.length - 1];

            const maxDist = 0.005; // ~500m fuzzy matching

            if (turf.distance(w_first, last) < maxDist) {
                joinedCoords.push(...c.slice(1));
                lines.splice(i, 1);
                found = true;
                break;
            } else if (turf.distance(w_last, last) < maxDist) {
                joinedCoords.push(...c.slice().reverse().slice(1));
                lines.splice(i, 1);
                found = true;
                break;
            } else if (turf.distance(w_last, first) < maxDist) {
                joinedCoords.unshift(...c.slice(0, c.length - 1));
                lines.splice(i, 1);
                found = true;
                break;
            } else if (turf.distance(w_first, first) < maxDist) {
                joinedCoords.unshift(...c.slice().reverse().slice(0, c.length - 1));
                lines.splice(i, 1);
                found = true;
                break;
            }
        }
        if (!found) {
            // just taking the nearest
            let nearestDist = Infinity;
            let nearestIdx = -1;
            let appendStart = false; // append to start or end of joined
            let reverseW = false;

            for (let i = 0; i < lines.length; i++) {
                let c = lines[i].geometry.coordinates;
                let w_first = c[0];
                let w_last = c[c.length - 1];

                let d1 = turf.distance(w_first, last);
                if (d1 < nearestDist) { nearestDist = d1; nearestIdx = i; appendStart = false; reverseW = false; }
                let d2 = turf.distance(w_last, last);
                if (d2 < nearestDist) { nearestDist = d2; nearestIdx = i; appendStart = false; reverseW = true; }
                let d3 = turf.distance(w_last, first);
                if (d3 < nearestDist) { nearestDist = d3; nearestIdx = i; appendStart = true; reverseW = false; }
                let d4 = turf.distance(w_first, first);
                if (d4 < nearestDist) { nearestDist = d4; nearestIdx = i; appendStart = true; reverseW = true; }
            }
            if (nearestIdx !== -1) {
                let c = lines[nearestIdx].geometry.coordinates;
                if (reverseW) c = c.slice().reverse();
                if (appendStart) {
                    joinedCoords.unshift(...c);
                } else {
                    joinedCoords.push(...c);
                }
                lines.splice(nearestIdx, 1);
            } else {
                break;
            }
        }
    }

    if (lines.length > 0) {
        console.warn("Could not join " + lines.length + " remaining lines");
    } else {
        console.log("Joined perfectly!");
    }

    let line = turf.lineString(joinedCoords, relation.tags);

    // Simplify
    console.log("Original points:", joinedCoords.length);
    // Simplify to about ~250 points
    let simplified = turf.simplify(line, { tolerance: 0.005, highQuality: true });
    console.log("Simplified points:", simplified.geometry.coordinates.length);

    // Try higher or lower if needed
    if (simplified.geometry.coordinates.length < 150) {
        simplified = turf.simplify(line, { tolerance: 0.002, highQuality: true });
        console.log("Re-Simplified points:", simplified.geometry.coordinates.length);
    } else if (simplified.geometry.coordinates.length > 300) {
        simplified = turf.simplify(line, { tolerance: 0.008, highQuality: true });
        console.log("Re-Simplified points:", simplified.geometry.coordinates.length);
    }

    // Preserve stations! The original malabar.geojson inside the repo has stations.
    // I should just replace the first feature (the LineString) and keep the rest (the stations).
    const existingGeoJsonStr = fs.readFileSync('public/geojson/malabar.geojson', 'utf8');
    let existingObj = JSON.parse(existingGeoJsonStr);

    const properties = {
        ...existingObj.features[0].properties,
        ...relation.tags,
        "algorithm": "Douglas-Peucker (Rerouted & Simplified via OSM Relation)",
        "points": simplified.geometry.coordinates.length
    };
    simplified.properties = properties;

    existingObj.features[0] = simplified;

    fs.writeFileSync('public/geojson/malabar_fixed.geojson', JSON.stringify(existingObj, null, 2));
    console.log('Saved malabar_fixed.geojson');
}

main();
