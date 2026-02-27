
import { P10Matrix } from '@eltran/shared';
import { usePidsData } from './hooks/usePidsData';


function App() {
    const { data } = usePidsData();

    // Parse mode from URL parameters
    const queryParams = new URLSearchParams(window.location.search);
    const mode = queryParams.get('mode') || 'outdoor';

    const isIndoor = mode === 'indoor';

    // Distinguish styling based on LED type (P10 Outdoor vs P4 Indoor)
    const ledScale = isIndoor ? 'scale-[1.8]' : 'scale-[2.8]';
    const bgColor = isIndoor ? 'bg-zinc-900' : 'bg-black';

    return (
        <div className={`flex flex-col h-screen w-full items-center justify-center ${bgColor} overflow-hidden select-none relative`}>
            {/* Mode Indicator Map */}
            <div className="absolute top-8 left-8 text-white/30 font-mono text-[10px] font-black uppercase tracking-[0.3em] pointer-events-none z-10">
                [ MODE: {isIndoor ? 'P4_INDOOR' : 'P10_OUTDOOR'} ]
            </div>

            <div className={`${ledScale} origin-center transition-transform duration-1000 ease-out`}>
                <P10Matrix
                    text={`~ TUJUAN AKHIR STASIUN ${(data.stations || [])[(data.stations || []).length - 1]} ~ BERHENTI DI: ${(data.stations || []).join(', ')}`}
                    fixedText={`${data.trainNumber} `}
                    color="#ff0000"
                    speed={data.ledSpeed}
                />
            </div>
        </div>
    );
}

export default App;
