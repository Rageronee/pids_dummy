import { useState, useEffect } from 'react';
import { P10Matrix } from './components/P10Matrix';
import { usePidsData } from './hooks/usePidsData';


function App() {
    const { data } = usePidsData();
    const [timeString, setTimeString] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // Parse mode from URL parameters
    const queryParams = new URLSearchParams(window.location.search);
    const mode = queryParams.get('mode') || 'outdoor';

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeString(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const isIndoor = mode === 'indoor';

    // Distinguish styling based on LED type (P10 Outdoor vs P4 Indoor)
    const ledColor = isIndoor ? '#ffbf00' : '#ff0000'; // Amber for indoor, Red for outdoor
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
                    text={`${data.stationName} KA-${data.trainNumber}   •   NEXT: ${data.nextStation}   •   ${timeString.replace(/\./g, ':')}`}
                    color={ledColor}
                    speed={data.ledSpeed || 60}
                />
            </div>
        </div>
    );
}

export default App;
