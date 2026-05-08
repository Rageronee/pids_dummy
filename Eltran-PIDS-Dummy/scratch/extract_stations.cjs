const fs = require('fs');

function extractStations(inputGeojsonPath, outputJsonPath) {
  try {
    const data = JSON.parse(fs.readFileSync(inputGeojsonPath, 'utf8'));
    const stations = [];
    
    for (const f of data.features) {
      if (f.geometry && f.geometry.type === 'Point') {
        const props = f.properties;
        const coords = f.geometry.coordinates;
        stations.push({
          name: props.name,
          longitude: coords[0],
          latitude: coords[1],
          schedules: Object.keys(props)
            .filter(k => k.startsWith('schedule_'))
            .reduce((acc, k) => {
              acc[k] = props[k];
              return acc;
            }, {})
        });
      }
    }
    
    fs.writeFileSync(outputJsonPath, JSON.stringify(stations, null, 2));
    console.log(`Extracted ${stations.length} stations to ${outputJsonPath}`);
  } catch(e) {
    console.error(`Error processing ${inputGeojsonPath}:`, e.message);
  }
}

extractStations(
  'packages/master-app/public/geojson/Progo/Progo.geojson',
  'Progo_Stations_Verification.json'
);

extractStations(
  'packages/master-app/public/geojson/Malabar/Malabar.geojson',
  'Malabar_Stations_Verification.json'
);
