const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getMalabarRoute() {
    const query = `
    [out:json];
    relation(17877979);
    out geom;
    node(r);
    out body;
  `;
    const outputPath = path.join(__dirname, 'malabar_raw.json');
    try {
        console.log('Fetching Malabar route data from Overpass API...');
        const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        fs.writeFileSync(outputPath, JSON.stringify(res.data, null, 2));
        console.log(`Saved raw data to ${outputPath}`);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

getMalabarRoute();
