
const fs = require('fs');
const path = require('path');

const filePath = 'f:\\Muhammad Afnan Risandi\\02_Projects\\Learning\\Magang\\Eltran\\PIDS\\Dummy\\Jadwal kereta.txt';
const content = fs.readFileSync(filePath, 'utf-8');

const lines = content.split('\n').map(l => l.trim());

const trains = [];
let currentTrain = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === 'Train Number') {
        if (currentTrain) trains.push(currentTrain);
        currentTrain = {
            number: lines[i+1],
            stops: []
        };
        i++; // skip number
        continue;
    }

    if (line === 'Origin' || line === 'Transit station' || line === 'Destination') {
        const stationName = lines[i-1];
        const type = line;
        
        const stop = {
            name: stationName,
            type: type,
            arrival: '',
            departure: ''
        };
        
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j] === 'Origin' || lines[j] === 'Transit station' || lines[j] === 'Destination' || lines[j] === 'Train Number') {
                break;
            }
            if (lines[j].startsWith('Arr ')) {
                stop.arrival = lines[j].substring(4);
            }
            if (lines[j].startsWith('Dep ')) {
                stop.departure = lines[j].substring(4);
            }
        }
        
        currentTrain.stops.push(stop);
    }
}
if (currentTrain) trains.push(currentTrain);

fs.writeFileSync('scratch/parsed_schedule.json', JSON.stringify(trains, null, 2), 'utf-8');
console.log('Successfully saved to scratch/parsed_schedule.json');
