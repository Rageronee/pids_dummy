const axios = require('axios');

async function searchMalabar() {
    const query = `
    [out:json];
    relation["route"="train"]["name"~"Malabar",i];
    out body;
  `;
    try {
        const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        res.data.elements.forEach(e => {
            console.log(`ID: ${e.id}, Name: ${e.tags.name}, From: ${e.tags.from}, To: ${e.tags.to}`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

searchMalabar();
