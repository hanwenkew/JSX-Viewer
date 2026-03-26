import React, { useState, useEffect } from 'react';
import * as Babel from '@babel/standalone';
import * as LucideIcons from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface PreviewProps {
  code: string;
  onCodeChange?: (newCode: string) => void;
}

export function Preview({ code, onCodeChange }: PreviewProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [debouncedCode, setDebouncedCode] = useState(code);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    // Inject Tailwind CSS script for runtime class generation
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      script.onload = () => {
        // Configure Tailwind once loaded
        if ((window as any).tailwind) {
          (window as any).tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
                },
              }
            }
          }
        }
      };
      document.head.appendChild(script);
      
      // Inject Inter font
      if (!document.getElementById('inter-font')) {
        const link = document.createElement('link');
        link.id = 'inter-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  useEffect(() => {
    try {
      // Basic preprocessing to make Codex output runnable
      
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

      // Create a function that provides React and other common libs in scope
      // We inject React, common hooks, and LucideIcons
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
        `
          ${transpiled}
          return typeof __DEFAULT_EXPORT__ !== 'undefined' ? __DEFAULT_EXPORT__ : null;
        `
      );

      const result = renderFn(
        React,
        React.useState,
        React.useEffect,
        React.useRef,
        React.useMemo,
        React.useCallback,
        React.useContext,
        React.useReducer,
        React.useLayoutEffect,
        LucideIcons
      );
      
      if (typeof result === 'function') {
        setComponent(() => result);
        setError(null);
      } else {
        // If the result is a React element, wrap it in a component
        if (React.isValidElement(result)) {
           setComponent(() => () => result);
           setError(null);
        } else {
           // If it didn't return anything, it might just be a component declaration without export default.
           // We could try to extract the last defined variable, but for now we require export default.
           setError("Could not find a default export or renderable component. Make sure your code has 'export default ComponentName'.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error parsing or rendering JSX');
      setComponent(null);
    }
  }, [debouncedCode]);

  const handleFixCode = async () => {
    if (!error) return;
    setIsFixing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const prompt = `You are an expert React developer. The following React JSX code threw an error.
Fix the error and return ONLY the raw fixed code. Do not include markdown formatting like \`\`\`jsx or \`\`\`.

Error:
${error}

Code:
${debouncedCode}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      let fixedCode = response.text || '';
      fixedCode = fixedCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

      if (onCodeChange) {
        onCodeChange(fixedCode);
      }
    } catch (err) {
      console.error("Failed to fix code:", err);
      alert("Failed to fix code with AI.");
    } finally {
      setIsFixing(false);
    }
  };

  if (error) {
    return (
      <div className="h-full p-4 overflow-auto bg-red-50 text-red-600 font-mono text-sm rounded-2xl border border-red-200 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold">Render Error:</h3>
          {onCodeChange && (
            <button
              onClick={handleFixCode}
              disabled={isFixing}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors font-sans font-medium text-xs disabled:opacity-50"
            >
              {isFixing ? <LucideIcons.Loader2 className="w-3 h-3 animate-spin" /> : <LucideIcons.Sparkles className="w-3 h-3" />}
              <span>{isFixing ? 'Fixing...' : 'Fix with AI'}</span>
            </button>
          )}
        </div>
        <pre className="whitespace-pre-wrap flex-1">{error}</pre>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-200">
        Processing JSX...
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white relative">
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </div>
  );
}

// Simple error boundary to catch runtime errors in the previewed component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-600 font-mono text-sm rounded-2xl border border-red-200">
          <h3 className="font-bold mb-2">Runtime Error:</h3>
          <pre className="whitespace-pre-wrap">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
