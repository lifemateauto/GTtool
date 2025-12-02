import React, { useRef } from 'react';
import { Upload, FileType, X } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  accept?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  label, 
  file, 
  onFileSelect, 
  onClear,
  accept = ".csv, .xls, .xlsx" 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
      />
      
      {!file ? (
        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-colors bg-white"
        >
          <Upload size={20} />
          <span>點擊上傳檔案 (CSV/Excel)</span>
        </button>
      ) : (
        <div className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileType className="flex-shrink-0 text-blue-500" size={24} />
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium truncate">{file.name}</span>
              <span className="text-xs text-blue-600">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1 hover:bg-blue-100 rounded-full text-blue-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};