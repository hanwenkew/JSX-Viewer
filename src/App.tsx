import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileCode2, SplitSquareHorizontal, X, UploadCloud, Download, Columns, Columns3, Code2, Play, Plus, History, FolderOpen, Search, Monitor, Tablet, Smartphone, Square, Info, ShieldCheck } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { Logo } from './components/Logo';
import { CodeViewer } from './components/CodeViewer';
import { Preview } from './components/Preview';
import { cn } from './lib/utils';

interface RecentFile {
  name: string;
  content: string;
  lastOpened: number;
}

interface OpenFile {
  id: string;
  name: string;
  content: string;
}

export default function App() {
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [layout, setLayout] = useState<'single' | 'grid-2' | 'grid-3'>(() => {
    const saved = localStorage.getItem('jsx-viewer-layout');
    return (saved as 'single' | 'grid-2' | 'grid-3') || 'single';
  });
  const [singleViewMode, setSingleViewMode] = useState<'split' | 'code' | 'preview'>(() => {
    const saved = localStorage.getItem('jsx-viewer-singleViewMode');
    return (saved as 'split' | 'code' | 'preview') || 'preview';
  });
  const [compareViewMode, setCompareViewMode] = useState<'code' | 'preview'>(() => {
    const saved = localStorage.getItem('jsx-viewer-compareViewMode');
    return (saved as 'code' | 'preview') || 'preview';
  });
  const [gridFiles, setGridFiles] = useState<[string | null, string | null, string | null]>([null, null, null]);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [isDraggingStartup, setIsDraggingStartup] = useState(false);
  const [draggedOverPanel, setDraggedOverPanel] = useState<number | null>(null);

  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    try {
      const saved = localStorage.getItem('jsx-viewer-recent-files');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>(() => {
    const saved = localStorage.getItem('jsx-viewer-viewport');
    return (saved as any) || 'desktop';
  });

  useEffect(() => {
    localStorage.setItem('jsx-viewer-viewport', viewportMode);
  }, [viewportMode]);

  const updateRecentFile = useCallback((name: string, content: string) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.name !== name);
      const next = [{ name, content, lastOpened: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem('jsx-viewer-recent-files', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecentFiles = () => {
    setRecentFiles([]);
    localStorage.removeItem('jsx-viewer-recent-files');
  };

  useEffect(() => {
    localStorage.setItem('jsx-viewer-layout', layout);
  }, [layout]);

  useEffect(() => {
    localStorage.setItem('jsx-viewer-singleViewMode', singleViewMode);
  }, [singleViewMode]);

  useEffect(() => {
    localStorage.setItem('jsx-viewer-compareViewMode', compareViewMode);
  }, [compareViewMode]);

  const [globalDropMode, setGlobalDropMode] = useState<'single' | 'split'>('single');

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (files.length > 0 && layout === 'single') {
        setIsDraggingGlobal(true);
        setGlobalDropMode(e.clientX > window.innerWidth / 2 ? 'split' : 'single');
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null || (e.relatedTarget as HTMLElement).nodeName === 'HTML') {
        setIsDraggingGlobal(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingGlobal(false);
      if (layout === 'single' && files.length > 0 && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const isSplit = e.clientX > window.innerWidth / 2;
        
        Array.from(e.dataTransfer.files).forEach(file => {
          if (file.name.endsWith('.jsx') || file.name.endsWith('.js') || file.name.endsWith('.tsx')) {
            // Limit file size to 1MB
            if (file.size > 1024 * 1024) {
              alert(`File ${file.name} is too large. Max size is 1MB.`);
              return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
              const newFileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
              const newFile = { id: newFileId, name: file.name, content: ev.target?.result as string };
              
              setFiles(prev => [...prev, newFile]);
              setActiveFileId(newFileId);
              updateRecentFile(file.name, ev.target?.result as string);
              
              if (isSplit) {
                setLayout('grid-2');
                setGridFiles(prev => {
                  const next = [...prev];
                  next[0] = activeFileId || prev[0];
                  next[1] = newFileId;
                  return next as [string | null, string | null, string | null];
                });
              } else {
                setLayout('single');
                setSingleViewMode('preview');
                setGridFiles(prev => {
                  const next = [...prev];
                  if (!next[0]) next[0] = newFileId;
                  else if (!next[1]) next[1] = newFileId;
                  else if (!next[2]) next[2] = newFileId;
                  return next as [string | null, string | null, string | null];
                });
              }
            };
            reader.readAsText(file);
          }
        });
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [files, layout, activeFileId]);

  useEffect(() => {
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files && launchParams.files.length > 0) {
          for (const fileHandle of launchParams.files) {
            const file = await fileHandle.getFile();
            const content = await file.text();
            addFile(file.name, content);
          }
        }
      });
    }
  }, []);

  const addFile = (name: string, content: string) => {
    const newFile = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), name, content };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setLayout('single');
    setSingleViewMode('preview');
    setGridFiles(prev => {
      const next = [...prev];
      if (!next[0]) next[0] = newFile.id;
      else if (!next[1]) next[1] = newFile.id;
      else if (!next[2]) next[2] = newFile.id;
      return next as [string | null, string | null, string | null];
    });
    updateRecentFile(name, content);
  };

  const handleFileDrop = (file: File) => {
    // Limit file size to 1MB
    if (file.size > 1024 * 1024) {
      alert(`File ${file.name} is too large. Max size is 1MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      addFile(file.name, e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const closeFile = (e: React.MouseEvent | React.PointerEvent, id: string) => {
    e.stopPropagation();
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      
      if (next.length === 0) {
        setActiveFileId(null);
      } else if (next.length === 1) {
        setLayout('single');
        setActiveFileId(next[0].id);
      } else if (next.length === 2) {
        setLayout('grid-2');
        setGridFiles([next[0].id, next[1].id, null]);
      } else {
        if (activeFileId === id) {
          setActiveFileId(next[next.length - 1].id);
        }
      }
      
      return next;
    });
    setGridFiles(prev => prev.map(fId => fId === id ? null : fId) as [string | null, string | null, string | null]);
  };

  const handleDownload = () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateFileContent = (id: string, newContent: string) => {
    setFiles(prev => {
      const next = prev.map(f => f.id === id ? { ...f, content: newContent } : f);
      const updatedFile = next.find(f => f.id === id);
      if (updatedFile) {
        updateRecentFile(updatedFile.name, newContent);
      }
      return next;
    });
  };

  const [zoomScale, setZoomScale] = useState(() => {
    const saved = localStorage.getItem('jsx-viewer-zoom');
    return saved ? parseFloat(saved) : 1;
  });
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showZoomIndicator) {
      timer = setTimeout(() => setShowZoomIndicator(false), 1500);
    }
    return () => clearTimeout(timer);
  }, [showZoomIndicator]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoomScale(prev => {
          const next = Math.min(Math.max(prev + delta, 0.5), 3);
          localStorage.setItem('jsx-viewer-zoom', next.toString());
          return next;
        });
        setShowZoomIndicator(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '0') {
          e.preventDefault();
          setZoomScale(1);
          localStorage.setItem('jsx-viewer-zoom', '1');
          setShowZoomIndicator(true);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoomScale(prev => {
            const next = Math.min(prev + 0.1, 3);
            localStorage.setItem('jsx-viewer-zoom', next.toString());
            return next;
          });
          setShowZoomIndicator(true);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoomScale(prev => {
            const next = Math.max(prev - 0.1, 0.5);
            localStorage.setItem('jsx-viewer-zoom', next.toString());
            return next;
          });
          setShowZoomIndicator(true);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (files.length === 0) {
    return (
      <main 
        className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 relative"
        style={{ zoom: zoomScale } as any}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingStartup(true); }}
        onDragLeave={(e) => { 
          e.preventDefault(); 
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingStartup(false); 
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingStartup(false);
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => handleFileDrop(file));
          }
        }}
      >
        {isDraggingStartup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-4 border-dashed border-gray-400 dark:border-gray-500 m-4 rounded-3xl pointer-events-none">
            <div className="text-gray-600 dark:text-gray-300 flex flex-col items-center">
              <UploadCloud className="w-16 h-16 mb-4" />
              <span className="font-bold text-2xl">Drop anywhere to open</span>
            </div>
          </div>
        )}

        <div className="w-full max-w-3xl flex flex-col items-center">
          <Logo size={64} className="mb-8" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tighter">JSX Viewer</h1>
          <p className="text-gray-400 dark:text-gray-500 mb-12 text-center max-w-sm text-lg font-medium leading-tight">The minimalist workbench for testing React UI components and UX flows.</p>
          
          <div className="flex items-center gap-6 mb-20">
            <label className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-full cursor-pointer transition-all font-semibold shadow-xl hover:scale-105 active:scale-95">
              <FolderOpen className="w-5 h-5" />
              Open file
              <input 
                type="file" 
                className="hidden" 
                accept=".js,.jsx,.tsx" 
                multiple 
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach(file => handleFileDrop(file));
                  }
                  e.target.value = '';
                }} 
              />
            </label>
            <button 
              onClick={() => addFile('Untitled.jsx', 'export default function App() {\n  return (\n    <div className="p-8 flex items-center justify-center min-h-screen bg-gray-50">\n      <h1 className="text-4xl font-bold text-gray-900">Hello World</h1>\n    </div>\n  );\n}')}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full transition-all font-semibold hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              New file
            </button>
          </div>

          {recentFiles.length > 0 && (
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-6 px-2">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Recent Files</h2>
                <button onClick={clearRecentFiles} className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Clear all</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {recentFiles.map(rf => (
                  <button 
                    key={rf.name} 
                    onClick={() => addFile(rf.name, rf.content)} 
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors text-left group"
                  >
                    <FileCode2 className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{rf.name}</div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {new Date(rf.lastOpened).toLocaleDateString()} at {new Date(rf.lastOpened).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  const getViewportStyles = () => {
    switch (viewportMode) {
      case 'mobile': return { width: '375px', margin: '0 auto' };
      case 'tablet': return { width: '768px', margin: '0 auto' };
      default: return { width: '100%' };
    }
  };

  const renderSingle = () => {
    const file = files.find(f => f.id === activeFileId) || files[0];
    if (!file) return null;

    return (
      <div className={cn("h-full gap-4", singleViewMode === 'split' ? "grid grid-cols-1 lg:grid-cols-2" : "flex")}>
        {(singleViewMode === 'split' || singleViewMode === 'code') && (
          <div className={cn("h-full flex flex-col min-h-0", singleViewMode === 'code' ? "w-full max-w-5xl mx-auto" : "")}>
            <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden">
              <CodeViewer code={file.content} />
            </div>
          </div>
        )}

        {(singleViewMode === 'split' || singleViewMode === 'preview') && (
          <div className={cn("h-full flex flex-col min-h-0", singleViewMode === 'preview' ? "w-full max-w-5xl mx-auto" : "")}>
            <div className="flex-1 min-h-0 relative bg-white dark:bg-gray-800 overflow-hidden">
              <div className="h-full overflow-auto flex flex-col">
                <div style={getViewportStyles()} className="flex-1 min-h-0 transition-all duration-300 ease-in-out">
                  <Preview code={file.content} onCodeChange={(c) => updateFileContent(file.id, c)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGrid = () => {
    const cols = layout === 'grid-2' ? 2 : 3;
    return (
      <div className={cn("h-full grid gap-4", cols === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-3")}>
        {Array.from({ length: cols }).map((_, i) => {
          const fileId = gridFiles[i] || files[0]?.id;
          const file = files.find(f => f.id === fileId) || files[0];
          
          return (
            <div 
              key={i} 
              className={cn(
                "h-full flex flex-col min-h-0 bg-white dark:bg-gray-800 overflow-hidden transition-all",
                draggedOverPanel === i 
                  ? "ring-4 ring-gray-900/20 dark:ring-gray-100/20" 
                  : ""
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggedOverPanel(i);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggedOverPanel(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggedOverPanel(null);
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  Array.from(e.dataTransfer.files).forEach(file => {
                    if (file.name.endsWith('.jsx') || file.name.endsWith('.js') || file.name.endsWith('.tsx')) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const newFileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        const newFile = { id: newFileId, name: file.name, content: ev.target?.result as string };
                        setFiles(prev => [...prev, newFile]);
                        updateRecentFile(file.name, ev.target?.result as string);
                        setGridFiles(prev => {
                          const next = [...prev];
                          next[i] = newFileId;
                          return next as [string | null, string | null, string | null];
                        });
                      };
                      reader.readAsText(file);
                    }
                  });
                }
              }}
            >
              <div className="flex-none h-12 flex items-center px-3 bg-gray-50 dark:bg-gray-800/50">
                <select
                  value={file?.id || ''}
                  onChange={(e) => {
                    const newGridFiles = [...gridFiles];
                    newGridFiles[i] = e.target.value;
                    setGridFiles(newGridFiles as any);
                  }}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                >
                  {files.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-h-0 relative p-0 bg-gray-50 dark:bg-gray-900/50 overflow-auto">
                {!file ? (
                  <div className="h-full flex items-center justify-center text-gray-400">No file selected</div>
                ) : compareViewMode === 'code' ? (
                  <CodeViewer code={file.content} />
                ) : (
                  <div className="h-full flex flex-col">
                    <div style={getViewportStyles()} className="flex-1 min-h-0 transition-all duration-300 ease-in-out">
                      <Preview code={file.content} onCodeChange={(c) => updateFileContent(file.id, c)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative"
    >
      {/* Global Drag Overlay */}
      {isDraggingGlobal && (
        <div className="absolute inset-0 z-50 flex m-4 gap-4 pointer-events-none">
          <div className={cn(
            "flex-1 flex flex-col items-center justify-center backdrop-blur-sm border-4 border-dashed rounded-2xl transition-colors",
            globalDropMode === 'single' ? "bg-black/60 border-gray-300 dark:border-gray-400" : "bg-black/40 border-gray-500 dark:border-gray-600"
          )}>
            <div className="text-white flex flex-col items-center">
              <UploadCloud className={cn("w-16 h-16 mb-4", globalDropMode === 'single' ? "text-white" : "text-gray-400")} />
              <span className="font-bold text-2xl">Drop to add file</span>
            </div>
          </div>
          <div className={cn(
            "flex-1 flex flex-col items-center justify-center backdrop-blur-sm border-4 border-dashed rounded-2xl transition-colors",
            globalDropMode === 'split' ? "bg-black/60 border-gray-300 dark:border-gray-400" : "bg-black/40 border-gray-500 dark:border-gray-600"
          )}>
            <div className="text-white flex flex-col items-center">
              <SplitSquareHorizontal className={cn("w-16 h-16 mb-4", globalDropMode === 'split' ? "text-white" : "text-gray-400")} />
              <span className="font-bold text-2xl">Drop to open in Split View</span>
            </div>
          </div>
        </div>
      )}

      {/* Header / Toolbar */}
      <header className="flex-none h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <Logo size={28} />
          <span className="font-bold text-gray-900 dark:text-white hidden sm:block tracking-tight text-lg">
            JSX Viewer
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Layout Toggles */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setLayout('single'); setSingleViewMode('split'); }}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                layout === 'single' && singleViewMode === 'split' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="Split View"
            >
              <SplitSquareHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setLayout('single'); setSingleViewMode('preview'); }}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                layout === 'single' && singleViewMode === 'preview' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="Canvas Only"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('grid-2')}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                layout === 'grid-2' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="2-Column Compare"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('grid-3')}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                layout === 'grid-3' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="3-Column Compare"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

          {/* Viewport Toggles */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewportMode('desktop')}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                viewportMode === 'desktop' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                viewportMode === 'tablet' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                viewportMode === 'mobile' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

          {/* View Mode Toggles */}
          {layout === 'single' ? (
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSingleViewMode('code')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-xl transition-colors flex items-center space-x-1",
                  singleViewMode === 'code' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Code2 className="w-4 h-4 mr-1" />
                Code
              </button>
              <button
                onClick={() => setSingleViewMode('split')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-xl transition-colors flex items-center space-x-1",
                  singleViewMode === 'split' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <SplitSquareHorizontal className="w-4 h-4 mr-1" />
                Split
              </button>
              <button
                onClick={() => setSingleViewMode('preview')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-xl transition-colors flex items-center space-x-1",
                  singleViewMode === 'preview' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Play className="w-4 h-4 mr-1" />
                Canvas
              </button>
            </div>
          ) : (
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCompareViewMode('code')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-xl transition-colors flex items-center space-x-1",
                  compareViewMode === 'code' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Code2 className="w-4 h-4 mr-1" />
                Code
              </button>
              <button
                onClick={() => setCompareViewMode('preview')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-xl transition-colors flex items-center space-x-1",
                  compareViewMode === 'preview' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Play className="w-4 h-4 mr-1" />
                Canvas
              </button>
            </div>
          )}

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

          {Math.round(zoomScale * 100) !== 100 && (
            <button
              onClick={() => { setZoomScale(1); setShowZoomIndicator(true); }}
              className="px-2 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {Math.round(zoomScale * 100)}%
            </button>
          )}

          <button
            onClick={() => setShowAboutModal(true)}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-100 rounded-2xl transition-colors"
            title="Privacy & About"
          >
            <Info className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

          <button
            onClick={handleDownload}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-100 rounded-2xl transition-colors"
            title="Download active file"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div className="flex-none h-12 bg-white dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto px-2 pt-2 gap-1">
        {files.map(f => (
          <div
            key={f.id}
            onClick={() => {
              setActiveFileId(f.id);
              setLayout('single');
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                closeFile(e, f.id);
              }
            }}
            className={cn(
              "flex items-center px-4 min-w-[120px] max-w-[200px] cursor-pointer group transition-colors rounded-t-2xl border border-b-0",
              activeFileId === f.id && layout === 'single'
                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                : "bg-gray-50 dark:bg-gray-800/50 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            )}
          >
            <span className="truncate flex-1 text-sm font-medium">{f.name}</span>
            <button
              onClick={(e) => closeFile(e, f.id)}
              className="ml-2 p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {/* Add File Button */}
        <label className="flex items-center justify-center w-10 rounded-t-2xl hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
          <Plus className="w-4 h-4" />
          <input 
            type="file" 
            className="hidden" 
            accept=".js,.jsx,.tsx" 
            multiple 
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach(file => handleFileDrop(file));
              }
              e.target.value = ''; // reset
            }} 
          />
        </label>
      </div>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-hidden p-4"
        style={{ zoom: zoomScale } as any}
      >
        {layout === 'single' ? renderSingle() : renderGrid()}
      </main>

      {/* Zoom Indicator */}
      <AnimatePresence>
        {showZoomIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-900 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 font-medium border border-white/10 dark:border-black/10"
          >
            <Search className="w-4 h-4" />
            <span>{Math.round(zoomScale * 100)}%</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About & Privacy Modal */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAboutModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Logo size={32} />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">About JSX Viewer</h2>
                  </div>
                  <button 
                    onClick={() => setShowAboutModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6 text-gray-600 dark:text-gray-400">
                  <p>
                    JSX Viewer is a minimalist, real-time workbench for testing React UI components and UX flows.
                    It's designed to be fast, local-first, and completely private.
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-3 text-gray-900 dark:text-white font-semibold">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      Privacy First
                    </div>
                    <p className="text-sm leading-relaxed">
                      Your code never leaves your browser. All data is processed locally and persisted only in your browser's <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">localStorage</code>.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs font-medium text-gray-400">Version 1.0.0</div>
                    <div className="flex gap-4">
                      <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-semibold text-gray-900 dark:text-white hover:underline">GitHub</a>
                      <a href="#" onClick={(e) => { e.preventDefault(); setShowAboutModal(false); }} className="text-sm font-semibold text-gray-900 dark:text-white hover:underline">License</a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Analytics />
    </div>
  );
}
