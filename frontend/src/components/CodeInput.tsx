import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import { Editor } from '@monaco-editor/react';
import { Copy, Send, X, Upload, FileText, Save } from 'lucide-react';

interface CodeInputProps {
  onSendCode: (code: string, language: string, filename?: string) => void;
  onClose: () => void;
  initialCode?: string;
  initialLanguage?: string;
  initialFilename?: string;
}

const languageExtensions: { [key: string]: string } = {
  'javascript': 'js',
  'typescript': 'ts',
  'python': 'py',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'csharp': 'cs',
  'go': 'go',
  'rust': 'rs',
  'ruby': 'rb',
  'php': 'php',
  'swift': 'swift',
  'kotlin': 'kt',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'json': 'json',
  'markdown': 'md',
  'yaml': 'yaml',
  'xml': 'xml',
  'sql': 'sql',
  'bash': 'sh',
  'powershell': 'ps1',
  'dockerfile': 'Dockerfile',
  'makefile': 'Makefile'
};

const CodeInput: React.FC<CodeInputProps> = ({
  onSendCode,
  onClose,
  initialCode = '',
  initialLanguage = 'javascript',
  initialFilename = ''
}) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [filename, setFilename] = useState(initialFilename);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'yaml', label: 'YAML' },
    { value: 'xml', label: 'XML' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'powershell', label: 'PowerShell' },
    { value: 'dockerfile', label: 'Dockerfile' },
    { value: 'makefile', label: 'Makefile' },
  ];

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Detect language from file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const detectedLanguage = Object.entries(languageExtensions).find(
      ([_, ext]) => ext.toLowerCase() === fileExtension
    )?.[0] || 'plaintext';

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content);
      setLanguage(detectedLanguage);
      if (!filename) {
        setFilename(file.name);
      }
    };
    reader.readAsText(file);
  }, [filename]);

  const handleSend = () => {
    if (code.trim()) {
      onSendCode(code, language, filename || undefined);
      onClose();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleDownload = () => {
    const extension = languageExtensions[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsLoading(false);
  };

  if (isLoading) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-900 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.ext"
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
            {filename && (
              <button
                onClick={() => setFilename('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className="text-gray-400 text-sm">
            .{languageExtensions[language] || 'txt'}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            title="Upload file"
          >
            <Upload size={16} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept={Object.values(languageExtensions).map(ext => `.${ext}`).join(',')}
          />
          <button
            onClick={handleDownload}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            title="Download file"
          >
            <Save size={16} />
          </button>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            title="Copy code"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-900 px-4 py-2 border-t border-gray-700 flex justify-between items-center">
        <div className="text-xs text-gray-400">
          {language.toUpperCase()}
          {filename && ` • ${filename}`}
        </div>
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded flex items-center space-x-1 text-sm font-medium"
          disabled={!code.trim()}
        >
          <Send size={16} className="mr-1" />
          Send Code
        </button>
      </div>
    </div>
  );
};

export default CodeInput;
