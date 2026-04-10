import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeViewerProps {
  code: string;
  onChange?: (value: string) => void;
}

export function CodeViewer({ code, onChange }: CodeViewerProps) {
  return (
    <div className="h-full overflow-hidden bg-[#1E1E1E] rounded-2xl border border-gray-800 grayscale">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange?.(value || '')}
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
        }}
      />
    </div>
  );
}
