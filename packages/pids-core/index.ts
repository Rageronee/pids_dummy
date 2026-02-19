export interface PidsPacket {
    header: string; // '*'
    controllerId: string; // '01'
    trainId: string; // '05'
    temp: number; // 24
    message: string; // 'ARGO WILIS'
    terminator: string; // '#'
}

export interface Station {
    id: string;
    name: string;
    lat: number;
    lon: number;
}
