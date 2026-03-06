/**
 * RouteCheckpoints — Section 2: Rute & Checkpoint Navigasi table
 * Extracted from MasterConsolePanel for modularity.
 */
import { ChangeEvent } from 'react';
import { MapPin, ChevronRight, Upload, Trash2, Info } from 'lucide-react';
import { SectionAccordion } from './ui/SectionAccordion';

interface RouteCheckpointsProps {
    route: any;
    data: any;
    navData: any[];
    uploading: boolean;
    navTableRef: React.RefObject<HTMLDivElement>;
    onUploadGeoJSON: (e: ChangeEvent<HTMLInputElement>) => void;
    onDeleteClick: () => void;
}

export function RouteCheckpoints({
    route, data, navData, uploading, navTableRef,
    onUploadGeoJSON, onDeleteClick
}: RouteCheckpointsProps) {
    return (
        <SectionAccordion
            title="2. Rute & Checkpoint Navigasi"
            icon={MapPin}
            defaultOpen={true}
            summary={!route?.name ? "Pilih Rute di Selector" : `Detail ${navData.length} POI Navigasi • Lokasi Saat Ini: ${navData.find((x: any) => x.status === "BERHENTI")?.name || data?.currentStation || '-'}`}
        >
            {!route?.name || route.name === '-' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl mt-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <MapPin size={32} className="text-slate-300" />
                    </div>
                    <h4 className="text-sm font-black text-[#1d2d6a] mb-1">Rute Belum Dipilih</h4>
                    <p className="text-xs font-bold text-slate-400 text-center max-w-xs tracking-tighter mb-6">Silakan pilih rute perjalanan pada aplikasi Selector atau unggah GeoJSON baru untuk membuat rute.</p>
                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-black text-white bg-[#ee6f1f] hover:bg-[#ee6f1f]/70 border border-slate-200 shadow-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Upload size={16} className={`text-white ${uploading ? 'animate-spin' : ''}`} /> {uploading ? 'Mengunggah...' : 'Import GeoJSON Baru'}
                            <input type="file" accept=".json,.geojson" className="hidden" onChange={onUploadGeoJSON} disabled={uploading} />
                        </label>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500">File Aktif:</span>
                            <span className="text-sm font-black text-[#1d2d6a]">
                                {route?.geojson ? (route.geojson_filename || `${route.name.replace(/\s+/g, '_')}.geojson`) : 'Belum Ada GeoJSON'}
                                {route?.geojson && <span className="ml-2 text-[10px] text-green-500 font-black bg-green-50 px-1.5 py-0.5 rounded border border-green-100 italic">Aktif</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={onDeleteClick} disabled={uploading} className={`text-xs font-black text-red-500 bg-white hover:bg-red-50 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${uploading ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                <Trash2 size={14} /> {uploading ? '...' : 'Hapus'}
                            </button>
                            <label className={`text-xs font-black text-white bg-[#ee6f1f] hover:bg-[#ee6f1f]/70 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Upload size={14} className={`text-white ${uploading ? 'animate-spin' : ''}`} /> {uploading ? 'Mengunggah...' : 'Import'}
                                <input type="file" accept=".json,.geojson" className="hidden" onChange={onUploadGeoJSON} disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    {!route?.geojson || navData.length === 0 ? (
                        <div className="mt-4 flex flex-col items-center justify-center py-16 px-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all hover:border-slate-300">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
                            <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Info size={40} className="text-slate-300" />
                            </div>
                            <h4 className="text-sm font-black text-[#1d2d6a] mb-2">Data Navigasi Kosong</h4>
                            <p className="text-[11px] font-bold text-slate-400 text-center max-w-[280px] tracking-tight leading-relaxed">
                                Silakan <span className="text-[#ee6f1f]">Impor GeoJSON</span> untuk memuat daftar stasiun, koordinat GPS, dan estimasi waktu kedatangan.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <div ref={navTableRef} className="overflow-x-auto max-h-[450px] overflow-y-auto relative">
                                <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0">
                                    <thead className="bg-[#1d2d6a] text-white sticky top-0 z-20">
                                        <tr>
                                            <th className="py-3.5 px-6 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a]">Nama Stasiun</th>
                                            <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a]">Ket</th>
                                            <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-right">Longitude</th>
                                            <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-right">Latitude</th>
                                            <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-center">TTA</th>
                                            <th className="py-3.5 px-4 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a] text-center">Status</th>
                                            <th className="py-3.5 px-6 text-[12px] font-black border-b border-[#152355] bg-[#1d2d6a]">Next Stasiun</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {navData.map((item: any, idx: number) => {
                                            const isBerhenti = item.status === 'BERHENTI';
                                            return (
                                                <tr key={idx} data-active={isBerhenti} className={`hover:bg-slate-50 transition-colors ${isBerhenti ? 'bg-orange-50/100' : 'bg-white'}`} style={{ scrollMarginTop: '46px' }}>
                                                    <td className={`py-3 px-6 font-black flex items-center gap-2 ${isBerhenti ? 'text-[#ee6f1f]' : 'text-slate-700'}`}>
                                                        {isBerhenti && <ChevronRight size={16} className="text-[#ee6f1f]" />}
                                                        {item.name}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-slate-500 text-xs">{item.type}</td>
                                                    <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs text-right">{item.lng}</td>
                                                    <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs text-right">{item.lat}</td>
                                                    <td className="py-3 px-4 font-mono font-black text-[#1d2d6a] text-center text-xs">{item.eta}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        {item.status ? (
                                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded shadow-sm ${isBerhenti ? 'bg-[#1d2d6a] text-white' : 'bg-slate-200 text-slate-500'}`}>{item.status}</span>
                                                        ) : (<span className="text-slate-300 text-xs">-</span>)}
                                                    </td>
                                                    <td className="py-3 px-6 font-bold text-slate-500 text-[11px]">{item.next}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </SectionAccordion>
    );
}
