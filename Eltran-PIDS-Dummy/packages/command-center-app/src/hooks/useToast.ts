/**
 * Ringkasan: command-center-app\src\hooks\useToast.ts
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */
import { useState, useCallback, useRef } from 'react';

/**
 * Reusable toast hook for showing notifications.
 */
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

