import React, { useState } from 'react';
import { EvidenceFile } from '../../types';
import { X, UploadCloud, FileText, Trash2, CheckCircle2, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFile: (file: EvidenceFile) => void;
  onRemoveFile: (fileId: string) => void;
  existingFiles: EvidenceFile[];
  onUploadFileToStorage?: (file: File) => Promise<string | null>;
}

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadFile,
  onRemoveFile,
  existingFiles,
  onUploadFileToStorage,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    let fileUrl = '#';
    if (onUploadFileToStorage) {
      const uploadedUrl = await onUploadFileToStorage(selectedFile);
      if (uploadedUrl) {
        fileUrl = uploadedUrl;
      }
    }

    const newEvidence: EvidenceFile = {
      id: `ev_${Date.now()}`,
      fileName: selectedFile.name,
      fileType: selectedFile.type || 'application/octet-stream',
      fileSize: selectedFile.size,
      uploadDate: new Date().toISOString().substring(0, 10),
      url: fileUrl
    };

    onUploadFile(newEvidence);
    setSelectedFile(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-brand-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Upload Supporting Evidence & Reports
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative cursor-pointer ${
            dragActive
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
              : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 bg-slate-50 dark:bg-slate-900'
          }`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drag & drop files here
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Supports PDF, Word, Excel, Images, Certificates (Max 25MB)
              </p>
            </div>
          </div>
        </div>

        {/* Selected Draft File */}
        {selectedFile && (
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile.type)}
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-slate-500">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={handleConfirmUpload}
              className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold shadow-sm hover:bg-brand-700 flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Attach</span>
            </button>
          </div>
        )}

        {/* Existing Attached Files List */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Attached Evidence ({existingFiles.length})
          </h4>
          
          {existingFiles.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No evidence files attached yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {existingFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.fileType)}
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {file.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatBytes(file.fileSize)} • Uploaded {file.uploadDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Remove File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
