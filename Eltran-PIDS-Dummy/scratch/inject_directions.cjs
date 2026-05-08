const fs = require('fs');
const path = require('path');

const malabarDir = 'packages/master-app/public/geojson/Malabar';
const progoDir = 'packages/master-app/public/geojson/Progo';

const malabarDirections = [
    { num: '67', label: 'KA 67 (MALANG - BANDUNG)', routeKey: 'MALABAR' },
    { num: '68', label: 'KA 68 (BANDUNG - MALANG)', routeKey: 'MALABAR' },
    { num: '69', label: 'KA 69 (MALANG - BANDUNG)', routeKey: 'MALABAR' },
    { num: '70', label: 'KA 70 (BANDUNG - MALANG)', routeKey: 'MALABAR' }
];

const progoDirections = [
    { num: '257B', label: 'KA 257B (LEMPUYANGAN - PASARSENEN)', routeKey: 'PROGO' },
    { num: '258B', label: 'KA 258B (PASARSENEN - LEMPUYANGAN)', routeKey: 'PROGO' }
];

function injectDirections(filePath, directions) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const lineString = data.features.find(f => f.geometry.type === 'LineString');
    if (lineString) {
        lineString.properties = lineString.properties || {};
        lineString.properties.available_directions = directions;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Injected directions into ${filePath}`);
    } else {
        console.log(`No LineString found in ${filePath}`);
    }
}

// Inject into main and specific files
injectDirections(path.join(malabarDir, 'Malabar.geojson'), malabarDirections);
injectDirections(path.join(progoDir, 'Progo.geojson'), progoDirections);

// Also handle _GO and _BACK if they exist
injectDirections(path.join(malabarDir, 'Malabar_GO.geojson'), malabarDirections);
injectDirections(path.join(malabarDir, 'Malabar_BACK.geojson'), malabarDirections);
injectDirections(path.join(progoDir, 'Progo_GO.geojson'), progoDirections);
injectDirections(path.join(progoDir, 'Progo_BACK.geojson'), progoDirections);
