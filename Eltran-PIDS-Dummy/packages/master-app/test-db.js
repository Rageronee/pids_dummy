import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:eltran123@172.16.0.200:5432/eltran_pids'
});

async function main() {
  try {
    const routeRes = await pool.query(
      `SELECT rs.id as rs_id, s.name as station_name, rs.sequence_order
       FROM route_stations rs
       JOIN stations s ON rs.station_id = s.id
       WHERE rs.route_id = 1
       ORDER BY rs.sequence_order`
    );
    console.log("MALABAR (Route ID 1) stations:");
    const stations = routeRes.rows;
    stations.forEach(s => {
      if (s.station_name.includes("Pakisaji") || s.station_name.includes("Ngebruk")) {
        console.log(s);
      }
    });

    const stopRes = await pool.query(
      `SELECT ss.route_station_id, s.name as station_name, ss.arrival_time, ss.departure_time, sch.train_number
       FROM schedule_stops ss
       JOIN route_stations rs ON ss.route_station_id = rs.id
       JOIN stations s ON rs.station_id = s.id
       JOIN schedules sch ON ss.schedule_id = sch.id
       WHERE sch.route_id = 1 AND (s.name ILIKE '%Pakisaji%' OR s.name ILIKE '%Ngebruk%')`
    );
    console.log("Stops in schedule_stops for Route ID 1:");
    stopRes.rows.forEach(r => {
      console.log(`KA: ${r.train_number}, Station: ${r.station_name}, A: ${r.arrival_time}, D: ${r.departure_time}`);
    });
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
