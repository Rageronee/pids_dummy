const axios = require('axios');
const fs = require('fs');

async function getArgoParahyangan() {
    const query = `
    [out:json];
    relation["route"="train"]["name"~"Argo Parahyangan",i];
    out geom;
    node(r);
    out body;
  `;
    try {
        const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        fs.writeFileSync('argo_raw.json', JSON.stringify(res.data, null, 2));
        console.log('Saved to argo_raw.json');
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

getArgoParahyangan();
