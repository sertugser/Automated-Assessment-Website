console.log("🚀 Starting application...");
console.log("📦 Loading modules...");

// Import CSS first (side effect)
import "./index.css";
console.log("✅ CSS imported");

import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./contexts/LanguageContext";

let rootElement: HTMLElement | null = null;

try {
  console.log("⚛️ Rendering React app...");

  rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("❌ Root element not found!");
    document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h1>Error: Root element not found</h1></div>';
  } else {
    createRoot(rootElement).render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );
    console.log("✅ App rendered successfully!");
  }
} catch (error) {
  console.error("❌ Failed to load or render app:", error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }
  rootElement = document.getElementById("root");
  if (rootElement) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    rootElement.innerHTML = `
      <div style="padding: 30px; font-family: sans-serif; max-width: 900px; margin: 50px auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #dc2626; margin-top: 0;">❌ Error Loading Application</h1>
        <p style="font-size: 16px; color: #374151;">There was an error loading the application modules.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <h2 style="color: #991b1b; margin-top: 0; font-size: 18px;">Error Message:</h2>
          <pre style="background: white; padding: 15px; border-radius: 4px; overflow: auto; white-space: pre-wrap; font-size: 13px; color: #1f2937; border: 1px solid #fca5a5;">${errorMessage}</pre>
        </div>
        ${errorStack ? `<details style="margin-top: 20px;"><summary style="cursor: pointer; color: #2563eb; font-weight: bold;">📋 Show Full Error Stack</summary><pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; margin-top: 10px; white-space: pre-wrap; font-size: 11px;">${errorStack}</pre></details>` : ""}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
          <h3 style="color: #374151;">🔧 Troubleshooting:</h3>
          <p style="color: #6b7280;">Stop the dev server (Ctrl+C), delete <code>node_modules/.vite</code>, then run <code>npm run dev</code> again. Check the browser console (F12) for details.</p>
        </div>
      </div>
    `;
  }
}