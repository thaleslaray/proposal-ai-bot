import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suprimir avisos chatos de features não reconhecidas
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes("Unrecognized feature: 'vr'") ||
    message.includes("Unrecognized feature: 'ambient-light-sensor'") ||
    message.includes("Unrecognized feature: 'battery'") ||
    message.includes("iframe which has both allow-scripts and allow-same-origin")
  ) {
    return;
  }
  originalError.apply(console, args);
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
