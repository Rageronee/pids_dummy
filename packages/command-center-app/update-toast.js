const fs = require('fs');
const filePath = 'f:/Muhammad Afnan Risandi/02_Projects/Learning/Magang/Eltran/PIDS/Dummy/Eltran-PIDS-Dummy/packages/command-center-app/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
content = content.replace('Building2, Calendar, Navigation, MapPinned, Thermometer\n} from', 'Building2, Calendar, Navigation, MapPinned, Thermometer, Info\n} from');

// 2. Add ToastComponent BEFORE `// ============================================================ // TYPES`
const typesComment = '// ============================================================\n// TYPES\n// ============================================================';

const toastCode = `
// ============================================================
// TOAST COMPONENT & HOOK
// ============================================================
function ToastNotification({ toast, onClose }: { toast: { msg: string; ok: boolean; id?: number } | null; onClose: () => void }) {
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 min-w-[350px] max-w-[420px]"
                >
                    <div className={\`absolute left-0 top-0 bottom-0 w-2 \${toast.ok ? 'bg-[#1d2d6a]' : 'bg-red-500'}\`} />
                    <div className="relative p-5 pl-7 pb-6">
                        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-50">
                            <X size={18} strokeWidth={2.5} />
                        </button>
                        <div className="flex gap-4">
                            <div className={\`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5 \${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-500'}\`}>
                                {toast.ok ? <Info size={24} className="text-white" /> : <X size={24} className="text-white" />}
                            </div>
                            <div className="flex flex-col pr-6">
                                <span className={\`font-semibold text-lg leading-tight mb-2 \${toast.ok ? 'text-[#1d2d6a]' : 'text-red-600'}\`}>
                                    {toast.ok ? 'Perhatian Penumpang' : 'Peringatan Sistem'}
                                </span>
                                <span className="text-slate-600 font-medium text-[15px] leading-relaxed mb-5">
                                    {toast.msg}
                                </span>
                                <div className="flex justify-end gap-5 items-center mt-2">
                                    <button onClick={onClose} className="text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors">Tutup</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={\`h-1.5 w-full absolute bottom-0 left-0 \${toast.ok ? 'bg-orange-100' : 'bg-red-100'}\`}>
                        <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5, ease: "linear" }} className={\`h-full \${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-500'}\`} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function useToast() {
    const [toast, setToast] = useState<{ msg: string; ok: boolean; id?: number } | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((msg: string, ok: boolean) => {
        setToast({ msg, ok, id: Date.now() });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
    }, []);

    const closeToast = useCallback(() => setToast(null), []);

    return { toast, showToast, closeToast };
}

`;

if (!content.includes('ToastNotification')) {
    content = content.replace(typesComment, toastCode + typesComment);
}

// 3. Replace state initialization
const oldStateStr = "const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);\n\n    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };";
const newStateStr = "const { toast, showToast, closeToast } = useToast();";
content = content.split(oldStateStr).join(newStateStr);

// 4. Replace AnimatePresence render blocks
const renderBlock1 = \`<AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={\\\`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold \${toast.ok ? 'bg-[#1d2d6a] text-white shadow-[0_8px_24px_rgba(29,45,106,0.25)]' : 'bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.25)]'}\\\`}>
                    {toast.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{toast.msg}
                </motion.div>}
            </AnimatePresence>\`;

const renderBlock2 = \`<AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={\\\`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold z-50 \${toast.ok ? 'bg-[#1d2d6a] text-white shadow-[0_8px_24px_rgba(29,45,106,0.3)]' : 'bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.3)]'}\\\`}>
                    {toast.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{toast.msg}
                </motion.div>}
            </AnimatePresence>\`;

const renderBlock3 = \`<AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={\\\`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold z-50 \${toast.ok ? 'bg-[#1d2d6a] text-white' : 'bg-red-500 text-white'}\\\`}>
                    {toast.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{toast.msg}
                </motion.div>}
            </AnimatePresence>\`;

const newRenderBlock = '<ToastNotification toast={toast} onClose={closeToast} />';

content = content.replace(renderBlock1, newRenderBlock); // TrainsPage
content = content.replace(renderBlock1, newRenderBlock); // RoutesPage
content = content.replace(renderBlock2, newRenderBlock); // UsersPage
content = content.replace(renderBlock3, newRenderBlock); // SchedulesPage

fs.writeFileSync(filePath, content);
console.log('Update Complete');
