
const DB_FILENAME = 'eltran-pids-db.json';

// --- SEED DATA (Moved from App.tsx) ---
const TRAIN_NAMES = ['ARGO BROMO ANGGREK', 'ARGO WILIS', 'TURANGGA', 'LODAYA', 'MALABAR', 'ARGO PARAHYANGAN'];
const TRAIN_NUMBERS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

const ROUTES = {
    'ARGO BROMO ANGGREK': {
        name: 'ARGO BROMO ANGGREK',
        number: 'KA 1',
        stations: ['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI'],
        nodes: [
            { pos: "M 80 150", label: "GMR", name: "GAMBIR" },
            { pos: "M 320 150", label: "CN", name: "CIREBON" },
            { pos: "M 560 150", label: "SMT", name: "SEMARANG TAWANG" },
            { pos: "M 750 150", label: "SBI", name: "SURABAYA PASARTURI" }
        ],
        path: "M 80 150 L 750 150"
    },
    'ARGO WILIS': {
        name: 'ARGO WILIS',
        number: 'KA 5',
        stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'],
        nodes: [
            { pos: "M 80 220", label: "BD", name: "BANDUNG" },
            { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
            { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
            { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
            { pos: "M 620 220", label: "MN", name: "MADIUN" },
            { pos: "M 750 150", label: "SGU", name: "SURABAYA GUBENG" }
        ],
        path: "M 80 220 C 150 220, 180 180, 220 180 S 350 220, 400 220 S 480 180, 520 180 S 580 220, 620 220 S 720 150, 750 150"
    },
    'TURANGGA': {
        name: 'TURANGGA',
        number: 'KA 65',
        stations: ['SURABAYA GUBENG', 'MADIUN', 'SOLO BALAPAN', 'YOGYAKARTA', 'TASIKMALAYA', 'BANDUNG'],
        nodes: [
            { pos: "M 750 150", label: "SGU", name: "SURABAYA GUBENG" },
            { pos: "M 620 220", label: "MN", name: "MADIUN" },
            { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
            { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
            { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
            { pos: "M 80 220", label: "BD", name: "BANDUNG" }
        ],
        path: "M 750 150 S 720 150, 620 220 S 580 220, 520 180 S 480 180, 400 220 S 350 220, 220 180 S 150 220, 80 220"
    },
    'LODAYA': {
        name: 'LODAYA',
        number: 'KA 91',
        stations: ['SOLO BALAPAN', 'YOGYAKARTA', 'KUTOARJO', 'TASIKMALAYA', 'BANDUNG'],
        nodes: [
            { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
            { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
            { pos: "M 320 200", label: "KTA", name: "KUTOARJO" },
            { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
            { pos: "M 80 220", label: "BD", name: "BANDUNG" }
        ],
        path: "M 520 180 S 480 180, 400 220 S 350 220, 320 200 S 250 200, 220 180 S 150 220, 80 220"
    },
    'MALABAR': {
        name: 'MALABAR',
        number: 'KA 121',
        stations: ['MALANG', 'BLITAR', 'KEDIRI', 'MADIUN', 'SOLO BALAPAN', 'YOGYAKARTA', 'TASIKMALAYA', 'BANDUNG'],
        nodes: [
            { pos: "M 850 200", label: "ML", name: "MALANG" },
            { pos: "M 780 220", label: "BL", name: "BLITAR" },
            { pos: "M 700 200", label: "KD", name: "KEDIRI" },
            { pos: "M 620 220", label: "MN", name: "MADIUN" },
            { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
            { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
            { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
            { pos: "M 80 220", label: "BD", name: "BANDUNG" }
        ],
        path: "M 850 200 S 820 220, 780 220 S 740 200, 700 200 S 660 220, 620 220 S 580 220, 520 180 S 480 180, 400 220 S 350 220, 220 180 S 150 220, 80 220"
    },
    'ARGO PARAHYANGAN': {
        name: 'ARGO PARAHYANGAN',
        number: 'KA 34',
        stations: ['GAMBIR', 'BEKASI', 'CIMAHI', 'BANDUNG'],
        nodes: [
            { pos: "M 80 150", label: "GMR", name: "GAMBIR" },
            { pos: "M 150 160", label: "BKS", name: "BEKASI" },
            { pos: "M 400 190", label: "CMI", name: "CIMAHI" },
            { pos: "M 80 220", label: "BD", name: "BANDUNG" }
        ],
        path: "M 80 150 Q 150 160, 400 190 T 80 220"
    }
};

const getFs = () => {
    if (window.require) {
        const fs = window.require('fs');
        const os = window.require('os');
        const path = window.require('path');
        // Pilih lokasi file DB: gunakan os.tmpdir() untuk menghindari masalah izin.
        // Menyimpan di direktori sementara agar kompatibel dengan lingkungan demo.
        const filePath = path.join(os.tmpdir(), DB_FILENAME);
        return { fs, filePath };
    }
    return null;
};

export const DatabaseService = {
    init: () => {
        const fsObj = getFs();
        if (!fsObj) return;
        const { fs, filePath } = fsObj;

        if (!fs.existsSync(filePath)) {
            console.log('Building new database with seed data...');
            const seed = {
                routes: ROUTES,
                trainNames: TRAIN_NAMES,
                trainNumbers: TRAIN_NUMBERS
            };
            fs.writeFileSync(filePath, JSON.stringify(seed, null, 2));
        }
    },

    getAll: () => {
        const fsObj = getFs();
        if (!fsObj) return { routes: {}, trainNames: [], trainNumbers: [] };
        const { fs, filePath } = fsObj;

        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) {
            console.error('Failed to read database:', e);
        }
        return { routes: {}, trainNames: [], trainNumbers: [] };
    },

    saveRoute: (key: string, data: any) => {
        const fsObj = getFs();
        if (!fsObj) return;
        const { fs, filePath } = fsObj;

        try {
            const current = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            current.routes[key] = data;
            // Also ensure it is in trainNames if not present
            if (!current.trainNames.includes(key)) {
                current.trainNames.push(key);
            }
            fs.writeFileSync(filePath, JSON.stringify(current, null, 2));
        } catch (e) {
            console.error('Failed to save route:', e);
        }
    },

    // Extensible for future database operations
};

