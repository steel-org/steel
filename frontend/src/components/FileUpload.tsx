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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const data = await apiService.uploadChatFile(file);
      const result: FileUploadResult = {
        url: data.url,
        path: data.path,
        size: data.size,
        type: data.type,
      };
      onFileUploaded(result);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
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
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={uploading}
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
              <p className="text-gray-400">Uploading...</p>
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
