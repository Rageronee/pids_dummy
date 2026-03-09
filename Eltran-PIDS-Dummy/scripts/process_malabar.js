const fs = require('fs');
const path = require('path');

/**
 * Ramer-Douglas-Peucker algorithm to simplify a path of points.
 * @param {Array} points - Array of [lon, lat] coordinates.
 * @param {number} epsilon - Tolerance for simplification.
 * @returns {Array} - Simplified array of coordinates.
 */
function simplifyPath(points, epsilon) {
    if (points.length < 3) return points;

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > epsilon) {
        const res1 = simplifyPath(points.slice(0, index + 1), epsilon);
        const res2 = simplifyPath(points.slice(index), epsilon);
        return res1.slice(0, res1.length - 1).concat(res2);
    } else {
        return [points[0], points[end]];
    }
}

function perpendicularDistance(pt, lineStart, lineEnd) {
    const x = pt[0], y = pt[1];
    const x1 = lineStart[0], y1 = lineStart[1];
    const x2 = lineEnd[0], y2 = lineEnd[1];

    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
        return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
    }

    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((x - nearestX) ** 2 + (y - nearestY) ** 2);
}

const rawPath = path.join(__dirname, 'malabar_raw.json');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

// Find the Malabar relation
const relation = raw.elements.find(e => e.type === 'relation' && e.id === 17877979);

if (!relation) {
    console.error('Relation 17877979 not found in raw data');
    process.exit(1);
}

let multiCoords = [];
for (const member of relation.members) {
    if (member.type === 'way' && member.geometry) {
        let wayCoords = member.geometry.map(p => [p.lon, p.lat]);
        if (wayCoords.length > 0) multiCoords.push(wayCoords);
    }
}

// Flatten and simplify - for a train route, we usually want one continuous line if possible, 
// but MultiLineString is safer for OSM data which might have gaps or overlaps.
// Let's simplify each segment.
// Merge adjacent segments to allow better simplification
let mergedCoords = [];
if (multiCoords.length > 0) {
    let currentSegment = multiCoords[0].map(p => [Number(p[0].toFixed(6)), Number(p[1].toFixed(6))]);
    for (let i = 1; i < multiCoords.length; i++) {
        const nextSegment = multiCoords[i].map(p => [Number(p[0].toFixed(6)), Number(p[1].toFixed(6))]);

        const lastPoint = currentSegment[currentSegment.length - 1];
        const firstPoint = nextSegment[0];

        // If points are very close, merge them
        const dist = Math.sqrt((lastPoint[0] - firstPoint[0]) ** 2 + (lastPoint[1] - firstPoint[1]) ** 2);
        if (dist < 0.001) {
            currentSegment.push(...nextSegment.slice(1));
        } else {
            mergedCoords.push(currentSegment);
            currentSegment = [...nextSegment];
        }
    }
    mergedCoords.push(currentSegment);
}

// Flatten and simplify - for a train route, we want one continuous line if possible
let flattenedCoords = [];
if (mergedCoords.length > 0) {
    flattenedCoords = mergedCoords[0];
    for (let i = 1; i < mergedCoords.length; i++) {
        // Just append, avoiding duplicate points at junctions
        flattenedCoords.push(...mergedCoords[i].slice(1));
    }
}

// Now simplify the flattened path
let epsilonValue = 0.001;
let finalSimplifiedCoords = [];
let totalPoints = 0;

while (epsilonValue < 1.0) {
    finalSimplifiedCoords = simplifyPath(flattenedCoords, epsilonValue);
    totalPoints = finalSimplifiedCoords.length;
    if (totalPoints <= 250) break; // 250 points ~ 800-1000 lines
    epsilonValue += 0.005;
}

console.log(`Simplified from ${multiCoords.length} to ${mergedCoords.length} segments, then flattened.`);
console.log(`Final: ${totalPoints} points (target 250) with epsilon ${epsilonValue.toFixed(6)}.`);

const geojson = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
                ...relation.tags,
                name: "Malabar Route",
                algorithm: "Douglas-Peucker (Flattened & Rounded)",
                epsilon: epsilonValue,
                points: totalPoints
            },
            geometry: {
                type: "LineString",
                coordinates: finalSimplifiedCoords
            }
        }
    ]
};






// Process stations
const nodes = raw.elements.filter(e => e.type === 'node');
let stationCount = 0;

// Filter for nodes that are members of the relation and have a name
for (const node of nodes) {
    const isMember = relation.members.find(m => m.type === 'node' && m.ref === node.id);
    if (isMember && node.tags && node.tags.name) {
        geojson.features.push({
            type: "Feature",
            properties: {
                ...node.tags,
                isCheckpoint: true,
                role: isMember.role || "stop"
            },
            geometry: {
                type: "Point",
                coordinates: [node.lon, node.lat]
            }
        });
        stationCount++;
    }
}

const outputFilePath = path.join(__dirname, '..', 'packages', 'master-app', 'public', 'geojson', 'malabar.geojson');
fs.writeFileSync(outputFilePath, JSON.stringify(geojson, null, 2));

console.log(`GeoJSON successfully generated at ${outputFilePath}`);
console.log(`Included ${stationCount} stations.`);
