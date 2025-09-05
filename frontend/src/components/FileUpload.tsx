import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { FileUploadResult } from '@/services/supabase';
import { apiService } from '@/services/api';
import { useChatStore } from '@/stores/chatStore';

interface FileUploadProps {
  onFileUploaded: (fileData: FileUploadResult) => void;
  onClose: () => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onClose,
  maxSize = 10,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx']
}) => {
  const { currentUser } = useChatStore();
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<'idle' | 'upload'>('idle');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOutReasonRef = useRef<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      alert('Please log in to upload files');
      return;
    }

    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    setUploading(true);
    setStage('upload');
    try {
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch {}
      }
      abortRef.current = new AbortController();
      timedOutReasonRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timedOutReasonRef.current = 'Upload timed out. Please check your connection or try a smaller file.';
        try { abortRef.current?.abort(); } catch {}
      }, 45_000);

      const data = await apiService.uploadChatFile(file, abortRef.current.signal);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      const { selectedChat } = useChatStore.getState();
      const originalName = data?.originalName || file.name;
      const result: any = {
        url: data.url,
        path: data.path,
        size: Number(data.size || file.size || 0),
        type: data.type || file.type,
        originalName,
        id: (data as any)?.id,
      } as any;
      onFileUploaded(result as FileUploadResult as any);
      onClose();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        const msg = timedOutReasonRef.current;
        timedOutReasonRef.current = null;
        if (msg) {
          alert(msg);
        }
        return;
      }
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setStage('idle');
      if (abortRef.current) abortRef.current = null;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={24} />;
    if (type.includes('pdf') || type.includes('document')) return <FileText size={24} />;
    return <File size={24} />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Upload File</h3>
          <button
            onClick={() => {
              try { abortRef.current?.abort(); } catch {}
              onClose();
            }}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-gray-400">Uploading file…</p>
              <button
                onClick={() => {
                  try { abortRef.current?.abort(); } catch {}
                  setUploading(false);
                }}
                className="mt-3 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload size={48} className="text-gray-400 mb-4" />
              <p className="text-white mb-2">Drop files here or click to browse</p>
              <p className="text-gray-400 text-sm">
                Max size: {maxSize}MB • Images, PDFs, Documents
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          accept={acceptedTypes.join(',')}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUpload;
