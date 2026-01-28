console.log("🚀 Starting application...");
console.log("📦 Loading modules...");

// Import CSS first (side effect)
import "./index.css";
console.log("✅ CSS imported");

let rootElement: HTMLElement | null = null;

try {
  // Import React modules
  console.log("⚛️ Importing React modules...");
  
  Promise.all([
    import("react-dom/client"),
    import("./App.tsx"),
    import("./contexts/LanguageContext")
  ]).then(([reactDom, AppModule, LanguageContextModule]) => {
    console.log("✅ All modules loaded");
    
    rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error("❌ Root element not found!");
      document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h1>Error: Root element not found</h1></div>';
      return;
    }

    console.log("✅ Root element found:", rootElement);
    console.log("🎨 Rendering React app...");
    
    const { createRoot } = reactDom;
    const App = AppModule.default;
    const { LanguageProvider } = LanguageContextModule;
    
    createRoot(rootElement).render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );
    
    console.log("✅ App rendered successfully!");
  }).catch((error) => {
    console.error("❌ Failed to load modules:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Log the full error to help debug
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if ('cause' in error) {
        console.error("Error cause:", (error as any).cause);
      }
    }
    
    rootElement = document.getElementById("root");
    if (rootElement) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      
      rootElement.innerHTML = `
        <div style="padding: 30px; font-family: sans-serif; max-width: 900px; margin: 50px auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin-top: 0;">❌ Error Loading Application</h1>
          <p style="font-size: 16px; color: #374151;">There was an error loading the application modules.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #991b1b; margin-top: 0; font-size: 18px;">Error Message:</h2>
            <pre style="background: white; padding: 15px; border-radius: 4px; overflow: auto; white-space: pre-wrap; font-size: 13px; color: #1f2937; border: 1px solid #fca5a5;">${errorMessage}</pre>
          </div>
          
          ${errorStack ? `
          <details style="margin-top: 20px;">
            <summary style="cursor: pointer; color: #2563eb; font-weight: bold; font-size: 16px; padding: 10px; background: #eff6ff; border-radius: 4px;">📋 Show Full Error Stack</summary>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; margin-top: 10px; white-space: pre-wrap; font-size: 11px; max-height: 400px;">${errorStack}</pre>
          </details>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <h3 style="color: #374151; margin-top: 0;">🔧 Troubleshooting Steps:</h3>
            <ol style="color: #6b7280; line-height: 1.8; padding-left: 20px;">
              <li style="margin-bottom: 10px;">
                <strong>Check browser console (F12)</strong> - Look for red error messages in the Console tab
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Reinstall dependencies:</strong> 
                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 3px; font-family: monospace; display: inline-block; margin-left: 5px;">npm install</code>
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Clear cache and restart:</strong> Stop the dev server (Ctrl+C), delete <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">node_modules/.vite</code> folder, then run <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">npm run dev</code> again
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Check Network tab (F12 > Network)</strong> - See if any files failed to load (red entries)
              </li>
            </ol>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>💡 Tip:</strong> Copy the error message above and share it for help. Also check the browser console (F12) for more detailed error information.
            </p>
          </div>
        </div>
      `;
    }
  });
  
} catch (error) {
  console.error("❌ Failed to initialize app:", error);
  rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: 50px auto;">
        <h1 style="color: #dc2626;">Error Initializing Application</h1>
        <p>There was an error initializing the application.</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; margin-top: 10px; white-space: pre-wrap; font-size: 12px;">${error instanceof Error ? (error.stack || error.message) : String(error)}</pre>
        <p style="margin-top: 20px; color: #666;">Please check the browser console (F12) for more details.</p>
      </div>
    `;
  }
}