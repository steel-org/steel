
import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Copy, Send, X } from 'lucide-react';

interface CodeInputProps {
  onSendCode: (code: string, language: string) => void;
  onClose: () => void;
  initialCode?: string;
  initialLanguage?: string;
}

const CodeInput: React.FC<CodeInputProps> = ({
  onSendCode,
  onClose,
  initialCode = '',
  initialLanguage = 'javascript'
}) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<any>(null);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'xml', label: 'XML' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'swift', label: 'Swift' }
  ];

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsLoading(false);
    editor.focus();
  };

  const handleSend = () => {
    if (code.trim()) {
      onSendCode(code.trim(), language);
      onClose();
    }
  };

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Share Code
            </h2>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              disabled={!code.trim()}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 transition-colors"
              title="Copy code"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 p-4">
          <div className="h-96 border border-gray-300 rounded-md overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-gray-500">Loading editor...</div>
              </div>
            ) : null}
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                automaticLayout: true,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                folding: true,
                renderWhitespace: 'selection',
                cursorBlinking: 'blink',
                cursorStyle: 'line',
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                },
                tabSize: 2,
                insertSpaces: true,
              }}
              theme="vs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+Enter</kbd> to send, 
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs ml-1">Esc</kbd> to close
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!code.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send size={16} />
              <span>Send Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeInput;
