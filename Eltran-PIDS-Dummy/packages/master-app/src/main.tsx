import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@eltran/shared";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary mode="display" systemName="Master PIDS">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
