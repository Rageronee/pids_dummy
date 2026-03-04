import fs from 'fs';
import * as turf from '@turf/turf';

const query = `
[out:json];
relation["route"="train"]["wikidata"="Q12491164"];
way(r);
out geom;
`;

async function main() {
    console.log('Fetching from Overpass...');
    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
    });
    const data = await res.json();

    // Create an adjacency list (Graph) of all coordinates.
    // Nodes will be stringified lon,lat

    const graph = new Map();
    function addEdge(p1, p2) {
        const k1 = p1[0].toFixed(5) + ',' + p1[1].toFixed(5);
        const k2 = p2[0].toFixed(5) + ',' + p2[1].toFixed(5);

        if (!graph.has(k1)) graph.set(k1, { coords: p1, neighbors: new Map() });
        if (!graph.has(k2)) graph.set(k2, { coords: p2, neighbors: new Map() });

        const dist = turf.distance(p1, p2, { units: 'kilometers' });
        graph.get(k1).neighbors.set(k2, dist);
        graph.get(k2).neighbors.set(k1, dist);
    }

    // also track original ways to prevent excessive simplification if not needed,
    // but building a node graph is easiest.
    for (let el of data.elements) {
        if (el.type === 'way' && el.geometry) {
            for (let i = 0; i < el.geometry.length - 1; i++) {
                let p1 = [el.geometry[i].lon, el.geometry[i].lat];
                let p2 = [el.geometry[i + 1].lon, el.geometry[i + 1].lat];
                addEdge(p1, p2);
            }
        }
    }

    console.log('Graph built with nodes:', graph.size);

    // Start: Malang Station: ~ 112.6373, -7.9790
    // End: Bandung Station: ~ 107.6013, -6.9143

    function findClosestNode(lon, lat) {
        let closest = null;
        let minD = Infinity;
        for (let [k, v] of graph.entries()) {
            let d = turf.distance([lon, lat], v.coords);
            if (d < minD) { minD = d; closest = k; }
        }
        return closest;
    }

    const startKey = findClosestNode(112.6373, -7.9790);
    const endKey = findClosestNode(107.6013, -6.9143);

    console.log('Start Node:', startKey);
    console.log('End Node:', endKey);

    // Dijkstra
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    for (let key of graph.keys()) {
        distances.set(key, Infinity);
        unvisited.add(key);
    }
    distances.set(startKey, 0);

    while (unvisited.size > 0) {
        let current = null;
        let currentDist = Infinity;

        for (let k of unvisited) {
            if (distances.get(k) < currentDist) {
                currentDist = distances.get(k);
                current = k;
            }
        }

        if (current === null || current === endKey) break;
        unvisited.delete(current);

        let node = graph.get(current);
        for (let [neighbor, dist] of node.neighbors.entries()) {
            let alt = currentDist + dist;
            if (alt < distances.get(neighbor)) {
                distances.set(neighbor, alt);
                previous.set(neighbor, current);
            }
        }
    }

    let path = [];
    let curr = endKey;
    while (curr) {
        path.unshift(graph.get(curr).coords);
        curr = previous.get(curr);
    }

    if (path.length > 1) {
        console.log('Path found with points:', path.length);

        let line = turf.lineString(path);
        let simplified = turf.simplify(line, { tolerance: 0.005, highQuality: true });
        if (simplified.geometry.coordinates.length < 150) {
            simplified = turf.simplify(line, { tolerance: 0.002, highQuality: true });
        } else if (simplified.geometry.coordinates.length > 300) {
            simplified = turf.simplify(line, { tolerance: 0.008, highQuality: true });
        }

        console.log('Simplified to points:', simplified.geometry.coordinates.length);

        const existingGeoJsonStr = fs.readFileSync('public/geojson/malabar.geojson', 'utf8');
        let existingObj = JSON.parse(existingGeoJsonStr);
        let newProps = {
            ...existingObj.features[0].properties,
            "algorithm": "Dijkstra over OSM ways + Douglas-Peucker",
            "points": simplified.geometry.coordinates.length
        };
        simplified.properties = newProps;
        existingObj.features[0] = simplified;

        fs.writeFileSync('public/geojson/malabar.geojson', JSON.stringify(existingObj, null, 2));
        console.log('Saved to malabar.geojson!');
    } else {
        console.error('Path not found!');
    }
}

main();
