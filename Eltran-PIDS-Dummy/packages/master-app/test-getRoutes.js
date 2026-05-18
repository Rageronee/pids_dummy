import { getRoutes, initDatabase } from './electron/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await initDatabase();
  const routes = await getRoutes();
  const malabarGo = routes['MALABAR_GO'];
  
  if (malabarGo && malabarGo.stations) {
    const pakisaji = malabarGo.stations.find(s => s.name.toLowerCase() === 'pakisaji');
    const ngebruk = malabarGo.stations.find(s => s.name.toLowerCase() === 'ngebruk');
    console.log("Pakisaji:", pakisaji);
    console.log("Ngebruk:", ngebruk);
  } else {
    console.log("No stations for MALABAR_GO");
  }
}

run();
