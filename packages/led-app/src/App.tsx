import { useState, useEffect } from 'react';
import { P10Matrix } from './components/P10Matrix';
import { usePidsData } from './hooks/usePidsData';


function App() {
    const { data } = usePidsData();
    const [timeString, setTimeString] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeString(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black overflow-hidden select-none">
            {/* 
              Container for the P10 Board.
              The P10Matrix component handles the "dots".
              We just center it here.
            */}
            <div className="scale-[2.5] origin-center">
                <P10Matrix
                    text={`${data.stationName} ${data.trainNumber}   •   NEXT: ${data.nextStation}   •   ${timeString}`}
                    color="#ff0000"
                    speed={data.ledSpeed || 60}
                />
            </div>
        </div>
    );
}

export default App;
