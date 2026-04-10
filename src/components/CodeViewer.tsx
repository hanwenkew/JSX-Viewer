import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Trash2, TextSelect, Check } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  onChange?: (value: string) => void;
}

export function CodeViewer({ code, onChange }: CodeViewerProps) {
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleClear = () => {
    onChange?.('');
    editorRef.current?.focus();
  };

  const handleSelectAll = () => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        editorRef.current.setSelection(model.getFullModelRange());
        editorRef.current.focus();
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1E1E1E] rounded-2xl border border-gray-800 grayscale overflow-hidden">
      {/* Mobile-friendly utility bar */}
      <div className="flex-none flex items-center justify-end gap-1 p-2 bg-[#252526] border-b border-gray-800">
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Select All"
        >
          <TextSelect className="w-4 h-4" />
          <span className="hidden sm:inline">Select All</span>
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
          title="Clear"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => onChange?.(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            formatOnPaste: true,
            contextmenu: false, // Disabling custom context menu helps native mobile interactions
          }}
        />
      </div>
    </div>
  );
}
