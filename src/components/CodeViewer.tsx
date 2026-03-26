import React from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

SyntaxHighlighter.registerLanguage('jsx', jsx);

interface CodeViewerProps {
  code: string;
}

const sanitizedTheme = Object.fromEntries(
  Object.entries(vscDarkPlus).map(([key, value]) => {
    const newValue = { ...value } as any;
    if (newValue.border && newValue.borderColor) {
      delete newValue.borderColor;
    }
    return [key, newValue];
  })
);

export function CodeViewer({ code }: CodeViewerProps) {
  return (
    <div className="h-full overflow-auto bg-[#1E1E1E] rounded-2xl border border-gray-800 grayscale">
      <SyntaxHighlighter
        language="jsx"
        style={sanitizedTheme}
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '14px' }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
