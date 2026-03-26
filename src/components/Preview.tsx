import React, { useState, useEffect, useRef } from 'react';
import * as Babel from '@babel/standalone';
import { AlertCircle } from 'lucide-react';

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
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  // Handle errors from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'error') {
        setError(event.data.message);
      } else if (event.data.type === 'ready') {
        updateIframe();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [debouncedCode]);

  const updateIframe = () => {
    if (!iframeRef.current) return;

    try {
      // 1. Handle lucide-react imports
      let processedCode = debouncedCode.replace(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/g, (match, imports) => {
        return `const { ${imports} } = LucideIcons;`;
      });

      // 2. Remove react imports
      processedCode = processedCode.replace(/import\s+.*?from\s+['"]react['"];?/g, '');

      // 3. Remove any other imports
      processedCode = processedCode.replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
      
      // 4. Replace `export default` with `const __DEFAULT_EXPORT__ = `
      processedCode = processedCode.replace(/export\s+default\s+/g, 'const __DEFAULT_EXPORT__ = ');
      
      // 5. Remove other exports
      processedCode = processedCode.replace(/export\s+/g, '');

      // Transpile JSX/TSX to JS
      const transpiled = Babel.transform(processedCode, {
        presets: ['react', 'env', ['typescript', { isTSX: true, allExtensions: true }]],
        filename: 'mockup.tsx',
      }).code;

      const finalCode = `
        ${transpiled}
        return typeof __DEFAULT_EXPORT__ !== 'undefined' ? __DEFAULT_EXPORT__ : null;
      `;

      iframeRef.current.contentWindow?.postMessage({ type: 'render', code: finalCode }, '*');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error transpiling JSX');
    }
  };

  useEffect(() => {
    updateIframe();
  }, [debouncedCode]);

  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/lucide-react@latest"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Inter', sans-serif; 
          background: transparent;
        }
        #root { min-height: 100vh; }
        /* Ensure all images have no-referrer policy */
        img { referrer-policy: no-referrer; }
      </style>
      <script>
        tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
              },
            }
          }
        }
      </script>
    </head>
    <body>
      <div id="root"></div>
      <script>
        let reactRoot = null;

        window.addEventListener('message', (event) => {
          if (event.data.type === 'render') {
            const { code } = event.data;
            try {
              const renderFn = new Function(
                'React',
                'useState',
                'useEffect',
                'useRef',
                'useMemo',
                'useCallback',
                'useContext',
                'useReducer',
                'useLayoutEffect',
                'LucideIcons',
                code
              );

              const Component = renderFn(
                window.React,
                window.React.useState,
                window.React.useEffect,
                window.React.useRef,
                window.React.useMemo,
                window.React.useCallback,
                window.React.useContext,
                window.React.useReducer,
                window.React.useLayoutEffect,
                window.lucide
              );

              const rootElement = document.getElementById('root');
              if (!reactRoot) {
                reactRoot = ReactDOM.createRoot(rootElement);
              }

              if (typeof Component === 'function') {
                reactRoot.render(React.createElement(Component));
              } else if (React.isValidElement(Component)) {
                reactRoot.render(Component);
              } else {
                throw new Error("No renderable component found. Make sure to 'export default' your component.");
              }
            } catch (err) {
              window.parent.postMessage({ type: 'error', message: err.message }, '*');
            }
          }
        });

        // Signal that we are ready
        window.parent.postMessage({ type: 'ready' }, '*');
      </script>
    </body>
    </html>
  `;

  return (
    <div className="h-full flex flex-col relative bg-white dark:bg-gray-900 overflow-hidden">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-mono text-sm rounded-xl border border-red-200 dark:border-red-800/50 shadow-lg backdrop-blur-md">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <h3 className="font-bold">Render Error</h3>
            </div>
          </div>
          <pre className="whitespace-pre-wrap max-h-[200px] overflow-auto">{error}</pre>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title="Preview Sandbox"
        className="flex-1 w-full border-none bg-white"
        sandbox="allow-scripts"
      />
    </div>
  );
}
