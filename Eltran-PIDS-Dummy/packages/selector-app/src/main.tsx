/**
 * Ringkasan: selector-app\src\main.tsx
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from '@eltran/shared'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary mode="operator" systemName="Selector App">
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)

