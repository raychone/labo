import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@dental-lab/ui/styles.css";

import { App } from "./app/app.js";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
