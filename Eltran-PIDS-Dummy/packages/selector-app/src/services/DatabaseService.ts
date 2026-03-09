const DB_FILENAME = 'eltran-pids-db.json';

const getFs = () => {
    if (window.require) {
        const fs = window.require('fs');
        const os = window.require('os');
        const path = window.require('path');
        const filePath = path.join(os.tmpdir(), DB_FILENAME);
        return { fs, filePath };
    }
    return null;
};

export const DatabaseService = {
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
    }
};
