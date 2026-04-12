import React, { useState, useEffect, useRef } from 'react';
import { X, Copy } from 'lucide-react';

const DebugConsole = () => {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Capture console.log
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type, args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyLogs = () => {
    const allLogs = logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(allLogs);
    alert('Logs copied!');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-bold"
      >
        📊 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 left-0 top-1/2 bg-black/90 text-white overflow-hidden flex flex-col z-50 border-t-2 border-red-500">
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-red-600 sticky top-0">
        <span className="font-bold text-sm">🔍 Debug Console ({logs.length})</span>
        <div className="flex gap-2">
          <button onClick={copyLogs} className="p-1 hover:bg-white/20 rounded" title="Copy">
            <Copy size={16} />
          </button>
          <button onClick={clearLogs} className="p-1 hover:bg-white/20 rounded text-xs">Clear</button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-black">
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet...</div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'warn' ? 'text-yellow-400' :
                'text-green-400'
              }`}
            >
              <span className="text-gray-500">[{log.time}]</span> {log.message}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default DebugConsole;
