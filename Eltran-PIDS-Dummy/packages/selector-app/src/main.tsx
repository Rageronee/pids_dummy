/** /selector-app/src/main.tsx — untuk mengubah: komponen PIDS; fungsi utama: main */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@eltran/shared";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary mode="operator" systemName="Selector App">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
