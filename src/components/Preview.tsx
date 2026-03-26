import React, { useState, useEffect, useRef } from 'react';
import * as Babel from '@babel/standalone';
import * as LucideIcons from 'lucide-react';

interface PreviewProps {
  code: string;
  onCodeChange?: (newCode: string) => void;
}

export function Preview({ code, onCodeChange }: PreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    try {
      // 1. Pre-process code for the sandbox
      let processedCode = debouncedCode;
      
      // Handle lucide-react imports (they will be available globally in the sandbox)
      processedCode = processedCode.replace(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/g, (match, imports) => {
        return `const { ${imports} } = LucideIcons;`;
      });

      // Remove react imports (React and hooks will be global)
      processedCode = processedCode.replace(/import\s+.*?from\s+['"]react['"];?/g, '');
      processedCode = processedCode.replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
      
      // Handle exports
      processedCode = processedCode.replace(/export\s+default\s+/g, 'window.__DEFAULT_EXPORT__ = ');
      processedCode = processedCode.replace(/export\s+/g, '');

      // 2. Transpile
      const transpiled = Babel.transform(processedCode, {
        presets: ['react', 'env', ['typescript', { isTSX: true, allExtensions: true }]],
        filename: 'mockup.tsx',
      }).code;

      // 3. Construct the sandboxed HTML
      const srcDoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/lucide@latest"></script>
            <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
            <style>
              body { margin: 0; padding: 0; font-family: sans-serif; }
              #root { height: 100vh; width: 100vw; overflow: auto; }
            </style>
            <script>
              window.tailwind.config = {
                theme: {
                  extend: {
                    fontFamily: {
                      sans: ['Inter', 'sans-serif'],
                    },
                  }
                }
              };
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script>
              const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer, useLayoutEffect } = React;
              const LucideIcons = LucideReact;
              
              window.onerror = function(message, source, lineno, colno, error) {
                window.parent.postMessage({ type: 'error', message: message }, '*');
              };

              try {
                ${transpiled}
                
                const rootElement = document.getElementById('root');
                const root = ReactDOM.createRoot(rootElement);
                
                if (typeof window.__DEFAULT_EXPORT__ === 'function') {
                  root.render(React.createElement(window.__DEFAULT_EXPORT__));
                } else if (React.isValidElement(window.__DEFAULT_EXPORT__)) {
                  root.render(window.__DEFAULT_EXPORT__);
                } else {
                  throw new Error("No default export found. Use 'export default ComponentName'.");
                }
              } catch (err) {
                window.parent.postMessage({ type: 'error', message: err.message }, '*');
              }
            </script>
          </body>
        </html>
      `;

      if (iframeRef.current) {
        iframeRef.current.srcdoc = srcDoc;
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Transpilation Error');
    }
  }, [debouncedCode]);

  // Listen for errors from the sandbox
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'error') {
        setError(event.data.message);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (error) {
    return (
      <div className="h-full p-6 overflow-auto bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-mono text-sm flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-2">
            <LucideIcons.AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg uppercase tracking-tight">Render Error</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm">
          <pre className="whitespace-pre-wrap leading-relaxed">{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white relative overflow-hidden">
      <iframe
        ref={iframeRef}
        title="Preview Sandbox"
        className="h-full w-full border-none"
        sandbox="allow-scripts"
      />
    </div>
  );
}
