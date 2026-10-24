import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress third-party Chrome extension errors (e.g. password managers reading M_ID) from triggering CRA error overlay
if (typeof window !== "undefined") {
  const isExtensionError = (e) =>
    (e?.filename && (e.filename.includes("chrome-extension://") || e.filename.includes("moz-extension://"))) ||
    (typeof e?.message === "string" && (e.message.includes("M_ID") || e.message.includes("chrome-extension://"))) ||
    (typeof e?.stack === "string" && (e.stack.includes("chrome-extension://") || e.stack.includes("moz-extension://")));

  window.addEventListener(
    "error",
    (event) => {
      if (isExtensionError(event) || isExtensionError(event?.error)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener("unhandledrejection", (event) => {
    if (isExtensionError(event?.reason)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
