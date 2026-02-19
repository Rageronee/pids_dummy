import { useEffect, useRef } from 'react';

interface P10MatrixProps {
    text: string;
    color?: string;
    speed?: number;
    columns?: number;
}

// Module dimensions: 320mm x 160mm, 10mm pitch => 32x16 pixels per module
// Standard height is 16 pixels
const LED_HEIGHT = 16;
const DOT_SIZE = 6; // Size of the dot in pixels (display size)
const GAP = 2; // Gap between dots
const PADDING = 4;

export const P10Matrix = ({ text, color = '#ff0000', speed = 50, columns = 128 }: P10MatrixProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const LED_WIDTH = columns;

    // State refs to manage independent animation loop
    const scrollOffset = useRef(-LED_WIDTH);
    const currentText = useRef(text);
    const incomingText = useRef(text);
    const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const fullTextDataRef = useRef<Uint8ClampedArray | null>(null);
    const fullTextWidthRef = useRef(0);
    const requestRef = useRef<number>();
    const speedRef = useRef(speed); // Track speed in ref to avoid re-effecting
    const lastUpdateRef = useRef(0);

    // Sync props to refs
    useEffect(() => {
        incomingText.current = text;
    }, [text]);

    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    // Helper to regenerate bitmap
    const updateBitmap = (textToRender: string) => {
        // Create or reuse offscreen canvas
        let textCanvas = textCanvasRef.current;
        if (!textCanvas) {
            textCanvas = document.createElement('canvas');
            textCanvasRef.current = textCanvas;
        }
        const textCtx = textCanvas.getContext('2d', { willReadFrequently: true });
        if (!textCtx) return;

        // 1. Measure
        textCtx.font = 'bold 12px "Courier New", monospace';
        const textMetrics = textCtx.measureText(textToRender);
        const textWidth = Math.ceil(textMetrics.width);

        // 2. Resize
        // Ensure width is at least screen width for short text
        textCanvas.width = textWidth + LED_WIDTH;
        textCanvas.height = LED_HEIGHT;

        // 3. Draw
        textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
        textCtx.font = 'bold 13px "Courier New", monospace';
        textCtx.fillStyle = '#ffffff';
        textCtx.textBaseline = 'middle';
        textCtx.fillText(textToRender, 0, LED_HEIGHT / 2 + 1);

        // 4. Extract Data
        fullTextDataRef.current = textCtx.getImageData(0, 0, textCanvas.width, LED_HEIGHT).data;
        fullTextWidthRef.current = textCanvas.width;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Fixed physical layout
        const displayWidth = LED_WIDTH * (DOT_SIZE + GAP) + PADDING * 2;
        const displayHeight = LED_HEIGHT * (DOT_SIZE + GAP) + PADDING * 2;
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Initial Bitmap Load
        updateBitmap(currentText.current);

        const render = (time: number) => {
            if (time - lastUpdateRef.current > speedRef.current) {
                lastUpdateRef.current = time;

                // Update Logic
                scrollOffset.current += 1; // Integer increments for crisp LED movement

                // Check for Loop End
                const actualTextWidth = fullTextWidthRef.current - LED_WIDTH;

                if (scrollOffset.current >= actualTextWidth + LED_WIDTH) { // Scroll all the way off screen
                    // RESET POINT
                    scrollOffset.current = -LED_WIDTH;

                    // Check for new text
                    if (currentText.current !== incomingText.current) {
                        currentText.current = incomingText.current;
                        updateBitmap(currentText.current);
                    }
                }
            }

            // --- DRAWING ---
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const offset = Math.floor(scrollOffset.current);
            const data = fullTextDataRef.current;
            const width = fullTextWidthRef.current;

            if (data) {
                for (let y = 0; y < LED_HEIGHT; y++) {
                    for (let x = 0; x < LED_WIDTH; x++) {
                        let isOn = false;
                        const sourceX = offset + x;

                        if (sourceX >= 0 && sourceX < width) {
                            const idx = (y * width + sourceX) * 4;
                            if (data[idx + 3] > 128) {
                                isOn = true;
                            }
                        }

                        const cx = PADDING + x * (DOT_SIZE + GAP) + DOT_SIZE / 2;
                        const cy = PADDING + y * (DOT_SIZE + GAP) + DOT_SIZE / 2;

                        ctx.beginPath();
                        ctx.arc(cx, cy, DOT_SIZE / 2, 0, Math.PI * 2);

                        if (isOn) {
                            ctx.fillStyle = color;
                            ctx.fill();
                            ctx.shadowColor = color;
                            ctx.shadowBlur = 4;
                            ctx.fill();
                            ctx.shadowBlur = 0;
                        } else {
                            ctx.fillStyle = '#1a1a1a';
                            ctx.fill();
                        }
                    }
                }
            }

            requestRef.current = requestAnimationFrame(render);
        };

        requestRef.current = requestAnimationFrame(render);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []); // Run ONCE. Depend only on refs locally.

    return (
        <div className="inline-block p-4 bg-[#111] rounded-2xl border-4 border-[#222] shadow-2xl">
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};
