/**
 * RouteCheckpoints — Section 2: Rute & Checkpoint Navigasi table
 * Extracted from MasterConsolePanel for modularity.
 */
import { ChangeEvent } from "react";
import { MapPin, ChevronRight, Upload, Trash2, Info } from "lucide-react";
import { SectionAccordion } from "./ui/SectionAccordion";

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
  route,
  data,
  navData,
  uploading,
  navTableRef,
  onUploadGeoJSON,
  onDeleteClick,
}: RouteCheckpointsProps) {
  // Helper to robustly extract station name from string, JSON string, or object
  const getStationName = (s: any): string => {
    if (!s || s === "-") return "-";
    if (typeof s === "string") {
      try {
        if (s.startsWith("{") && s.endsWith("}")) {
          const parsed = JSON.parse(s);
          if (parsed && parsed.name) return parsed.name;
        }
      } catch (e) {}
      return s;
    }
    return s.name || s.id || "-";
  };

  const currentStationDisp =
    navData.find((x: any) => x.status === "BERHENTI")?.name ||
    getStationName(data?.currentStation);

  return (
    <SectionAccordion
      title="2. Rute & Checkpoint Navigasi"
      icon={MapPin}
      defaultOpen={true}
      summary={
        !route?.name
          ? "Pilih Rute di Selector"
          : `Detail ${navData.length} POI Navigasi • Lokasi Saat Ini: ${currentStationDisp || "-"}`
      }
    >
      {!route?.name || route.name === "-" ? (
        <div className="flex flex-col items-center justify-center py-20 px-10 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] mt-6 transition-colors">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm mb-6 transition-colors">
            <MapPin size={48} className="text-slate-300 dark:text-slate-500" />
          </div>
          <h4 className="text-xl font-bold text-[#1d2d6a] dark:text-white mb-2 tracking-tight">
            Rute Belum Dipilih
          </h4>
          <p className="text-base font-bold text-slate-400 dark:text-slate-500 text-center max-w-sm tracking-tight mb-8">
            Silakan pilih rute perjalanan pada aplikasi Selector atau unggah
            GeoJSON baru untuk membuat rute.
          </p>
          <div className="flex items-center gap-4">
            <label
              className={`text-sm font-bold text-white bg-[#ee6f1f] hover:bg-[#ee6f1f]/70 border border-slate-200 dark:border-slate-800 shadow-md px-10 py-4 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Upload
                size={22}
                className={`text-white ${uploading ? "animate-spin" : ""}`}
              />{" "}
              {uploading ? "Mengunggah..." : "Import GeoJSON Baru"}
              <input
                type="file"
                accept=".json,.geojson"
                className="hidden"
                onChange={onUploadGeoJSON}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                File Aktif:
              </span>
              <span className="text-base font-bold text-[#1d2d6a] dark:text-white">
                {route?.geojson
                  ? route.geojson_filename ||
                    `${route.name.replace(/\s+/g, "_")}.geojson`
                  : "Belum Ada GeoJSON"}
                {route?.geojson && (
                  <span className="ml-3 text-xs text-white font-bold bg-[#ee6f1f] px-2 py-1 rounded-lg border border-[#ee6f1f] italic uppercase tracking-widest">
                    Aktif
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onDeleteClick}
                disabled={uploading}
                className={`text-sm font-bold text-red-500 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/40 border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-3 rounded-2xl flex items-center gap-3 transition-colors ${uploading ? "opacity-50 grayscale pointer-events-none" : ""}`}
              >
                <Trash2 size={20} /> {uploading ? "..." : "Hapus"}
              </button>
              <label
                className={`text-sm font-bold text-white bg-[#ee6f1f] hover:bg-[#ee6f1f]/70 border border-slate-200 dark:border-slate-800 shadow-md px-6 py-3 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Upload
                  size={20}
                  className={`text-white ${uploading ? "animate-spin" : ""}`}
                />{" "}
                {uploading ? "Mengunggah..." : "Import"}
                <input
                  type="file"
                  accept=".json,.geojson"
                  className="hidden"
                  onChange={onUploadGeoJSON}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {!route?.geojson || navData.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center py-16 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-100 dark:via-slate-800 to-transparent" />
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Info size={40} className="text-slate-300 dark:text-slate-600" />
              </div>
              <h4 className="text-sm font-bold text-[#1d2d6a] dark:text-white mb-2">
                Data Navigasi Kosong
              </h4>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 text-center max-w-[280px] tracking-tight leading-relaxed">
                Silakan <span className="text-[#ee6f1f]">Impor GeoJSON</span>{" "}
                untuk memuat daftar stasiun, koordinat GPS, dan estimasi waktu
                kedatangan.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-md bg-white dark:bg-slate-900 flex flex-col transition-colors">
                {/* Header Container - NON-Scrolling vertically */}
                <div className="flex-shrink-0 bg-[#1d2d6a] dark:bg-slate-800 text-white border-b border-[#152355] dark:border-slate-700 transition-colors">
                  <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0 table-fixed">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[8%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[8%]" />
                      <col className="w-[12%]" />
                      <col className="w-[28%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="py-6 px-6 text-sm font-bold uppercase tracking-widest first:rounded-tl-[2rem]">
                          Nama Stasiun
                        </th>
                        <th className="py-6 px-4 text-sm font-bold uppercase tracking-widest">
                          Ket
                        </th>
                        <th className="py-6 px-4 text-sm font-bold text-right uppercase tracking-widest">
                          Longitude
                        </th>
                        <th className="py-6 px-4 text-sm font-bold text-right uppercase tracking-widest">
                          Latitude
                        </th>
                        <th className="py-6 px-4 text-sm font-bold text-center uppercase tracking-widest">
                          TTA
                        </th>
                        <th className="py-6 px-4 text-sm font-bold text-center uppercase tracking-widest">
                          Status
                        </th>
                        <th className="py-6 px-6 text-sm font-bold uppercase tracking-widest last:rounded-tr-[2rem]">
                          Next Stasiun
                        </th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Body Container - Scrolling vertically dengan radius bawah yang selaras */}
                <div
                  ref={navTableRef}
                  className="flex-grow overflow-x-hidden max-h-[600px] overflow-y-auto relative custom-scrollbar bg-white dark:bg-slate-900 rounded-b-[2.5rem] pb-10 transition-colors"
                >
                  <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0 table-fixed">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[8%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[8%]" />
                      <col className="w-[12%]" />
                      <col className="w-[28%]" />
                    </colgroup>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-base">
                      {navData.map((item: any, idx: number) => {
                        const isBerhenti = item.status === "BERHENTI";
                        return (
                          <tr
                            key={idx}
                            data-active={isBerhenti}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isBerhenti ? "bg-orange-50/100 dark:bg-[#ee6f1f]/10" : "bg-white dark:bg-slate-900"}`}
                            style={{ scrollMarginTop: "64px" }}
                          >
                            <td
                              className={`py-6 px-6 font-bold flex items-center gap-4 ${isBerhenti ? "text-[#ee6f1f]" : "text-slate-700 dark:text-slate-300"}`}
                            >
                              {isBerhenti && (
                                <ChevronRight
                                  size={20}
                                  className="text-[#ee6f1f]"
                                />
                              )}
                              <div className="truncate" title={item.name}>
                                {item.name}
                              </div>
                            </td>
                            <td
                              className="py-6 px-4 font-bold text-slate-500 dark:text-slate-500 text-xs uppercase tracking-wider truncate"
                              title={item.type}
                            >
                              {item.type}
                            </td>
                            <td className="py-6 px-4 font-mono font-bold text-slate-600 dark:text-slate-400 text-sm text-right">
                              {item.lng}
                            </td>
                            <td className="py-6 px-4 font-mono font-bold text-slate-600 dark:text-slate-400 text-sm text-right">
                              {item.lat}
                            </td>
                            <td className="py-6 px-4 font-mono font-bold text-[#1d2d6a] dark:text-[#ee6f1f] text-center text-base">
                              {item.eta}
                            </td>
                            <td className="py-6 px-4 text-center">
                              {item.status ? (
                                <span
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-widest ${isBerhenti ? "bg-[#1d2d6a] dark:bg-[#ee6f1f] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
                                >
                                  {item.status}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 text-sm">
                                  -
                                </span>
                              )}
                            </td>
                            <td
                              className="py-6 px-6 font-bold text-slate-500 dark:text-slate-500 text-xs italic truncate"
                              title={item.next}
                            >
                              {item.next}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </SectionAccordion>
  );
}
