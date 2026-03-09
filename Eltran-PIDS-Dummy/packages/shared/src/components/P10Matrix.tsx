import { useEffect, useRef } from 'react';

interface P10MatrixProps {
    text: string;
    fixedText?: string;
    color?: string;
    speed?: number;
    columns?: number;
    fixedColumns?: number;
    dotSize?: number;
    gap?: number;
    padding?: number;
    ledHeight?: number;
    fontSize?: number;
}

export const P10Matrix = ({
    text,
    fixedText = '',
    color = '#ff0000',
    speed = 50,
    columns = 128,
    fixedColumns = 18,
    dotSize = 2,
    gap = 2,
    padding = 4,
    ledHeight = 16,
    fontSize = 13
}: P10MatrixProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const LED_WIDTH = columns;
    const LED_HEIGHT = ledHeight;
    const DOT_SIZE = dotSize;
    const GAP = gap;
    const PADDING = padding;
    const FONT_SIZE = fontSize;

    // State refs to manage independent animation loop
    const scrollOffset = useRef(-LED_WIDTH);
    const currentText = useRef(text);
    const incomingText = useRef(text);
    const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const fullTextDataRef = useRef<Uint8ClampedArray | null>(null);
    const fullTextWidthRef = useRef(0);
    const fixedCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const fixedTextDataRef = useRef<Uint8ClampedArray | null>(null);
    const fixedTextWidthRef = useRef(0);
    const requestRef = useRef<number>();
    const speedRef = useRef(speed);
    const lastUpdateRef = useRef(0);

    // Sync props to refs
    useEffect(() => {
        incomingText.current = text;
    }, [text]);

    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    // Helper to regenerate bitmap
    const updateBitmap = (textToRender: string, fixedTextToRender: string) => {
        // --- 1. Render Fixed Text ---
        let fixedCanvas = fixedCanvasRef.current;
        if (!fixedCanvas) {
            fixedCanvas = document.createElement('canvas');
            fixedCanvasRef.current = fixedCanvas;
        }
        const fixedCtx = fixedCanvas.getContext('2d', { willReadFrequently: true });

        if (fixedCtx && fixedTextToRender) {
            fixedCtx.font = `bold ${FONT_SIZE}px sans-serif`;
            const metrics = fixedCtx.measureText(fixedTextToRender);
            const paddingRight = 4;
            const xOffset = 1;

            // If fixedColumns is provided, use it. Otherwise calculate dynamically.
            const fixedWidth = fixedColumns !== undefined
                ? fixedColumns
                : Math.ceil(metrics.width) + xOffset + paddingRight;

            fixedCanvas.width = fixedWidth;
            fixedCanvas.height = LED_HEIGHT;

            fixedCtx.clearRect(0, 0, fixedCanvas.width, fixedCanvas.height);
            fixedCtx.font = `bold ${FONT_SIZE}px sans-serif`;
            fixedCtx.fillStyle = '#ffffff';
            fixedCtx.textBaseline = 'middle';
            fixedCtx.imageSmoothingEnabled = false;

            fixedCtx.fillText(fixedTextToRender, xOffset, Math.floor(LED_HEIGHT / 2) + 1);

            fixedTextDataRef.current = fixedCtx.getImageData(0, 0, fixedCanvas.width, LED_HEIGHT).data;
            fixedTextWidthRef.current = fixedCanvas.width;
        } else {
            fixedTextDataRef.current = null;
            fixedTextWidthRef.current = 0;
        }

        // --- 2. Render Scrolling Text ---
        let textCanvas = textCanvasRef.current;
        if (!textCanvas) {
            textCanvas = document.createElement('canvas');
            textCanvasRef.current = textCanvas;
        }
        const textCtx = textCanvas.getContext('2d', { willReadFrequently: true });
        if (!textCtx) return;

        textCtx.font = `bold ${FONT_SIZE}px sans-serif`;
        const textMetrics = textCtx.measureText(textToRender);
        const scrollWidth = Math.ceil(textMetrics.width) + 1;

        const scrollingAreaWidth = LED_WIDTH - fixedTextWidthRef.current;
        textCanvas.width = scrollWidth + scrollingAreaWidth;
        textCanvas.height = LED_HEIGHT;

        textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
        textCtx.font = `bold ${FONT_SIZE}px sans-serif`;
        textCtx.fillStyle = '#ffffff';
        textCtx.textBaseline = 'middle';
        textCtx.imageSmoothingEnabled = false;

        textCtx.fillText(textToRender, 0, Math.floor(LED_HEIGHT / 2) + 1);

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
        updateBitmap(currentText.current, fixedText);

        const render = (time: number) => {
            const fWidth = fixedTextWidthRef.current;
            const scrollAreaWidth = LED_WIDTH - fWidth;

            if (time - lastUpdateRef.current > speedRef.current) {
                lastUpdateRef.current = time;

                // Update Logic
                scrollOffset.current += 1;

                // Check for Loop End
                const actualTextWidth = fullTextWidthRef.current - scrollAreaWidth;

                if (scrollOffset.current >= actualTextWidth + scrollAreaWidth) {
                    scrollOffset.current = -scrollAreaWidth;

                    // Check for new text
                    if (currentText.current !== incomingText.current) {
                        currentText.current = incomingText.current;
                        updateBitmap(currentText.current, fixedText);
                    }
                }
            }

            // --- DRAWING ---
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const offset = Math.floor(scrollOffset.current);
            const data = fullTextDataRef.current;
            const scrollWidth = fullTextWidthRef.current;
            const fData = fixedTextDataRef.current;

            for (let y = 0; y < LED_HEIGHT; y++) {
                for (let x = 0; x < LED_WIDTH; x++) {
                    let isOn = false;

                    if (x < fWidth) {
                        // We are in the fixed text area
                        if (fData) {
                            const idx = (y * fWidth + x) * 4;
                            if (fData[idx + 3] > 128) {
                                isOn = true;
                            }
                        }
                    } else if (data) {
                        // We are in the scrolling text area
                        const scrollX = x - fWidth;
                        const sourceX = offset + scrollX;

                        if (sourceX >= 0 && sourceX < scrollWidth) {
                            const idx = (y * scrollWidth + sourceX) * 4;
                            if (data[idx + 3] > 128) {
                                isOn = true;
                            }
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

            requestRef.current = requestAnimationFrame(render);
        };

        requestRef.current = requestAnimationFrame(render);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [fixedText, LED_WIDTH, LED_HEIGHT, DOT_SIZE, GAP, PADDING, FONT_SIZE, color]);

    return (
        <div className="inline-block p-4 bg-[#111] rounded-2xl border-4 border-[#222] shadow-2xl">
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};
