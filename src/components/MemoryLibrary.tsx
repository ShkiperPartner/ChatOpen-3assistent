import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Library, Upload, Trash2, FileText, Globe, Lock, AlertCircle } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { validateFile } from '../lib/fileProcessing';

export const MemoryLibrary: React.FC = () => {
  const {
    libraryDocuments,
    toggleMemoryLibrary,
    loadLibraryDocuments,
    uploadDocumentToLibrary,
    deleteLibraryDocument,
    uploading,
    error
  } = useStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load documents on mount
  useEffect(() => {
    loadLibraryDocuments();
  }, [loadLibraryDocuments]);

  const handleFileSelect = (file: File) => {
    setUploadError(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      setUploadError(null);

      await uploadDocumentToLibrary(selectedFile, isPublic);

      // Reset form on success
      setSelectedFile(null);
      setIsPublic(false);
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteLibraryDocument(id);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Library className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Memory Library 📚
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Global knowledge base for all AI assistants
              </p>
            </div>
          </div>
          <button
            onClick={toggleMemoryLibrary}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Upload Document
            </h3>

            <FileDropZone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onFileRemove={handleRemoveFile}
              error={uploadError || error}
              disabled={uploading || isProcessing}
            />

            {/* Public/Private Toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={uploading || isProcessing}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Public Document
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Private Document
                      </span>
                    </>
                  )}
                </div>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isPublic
                  ? 'Available to all users'
                  : 'Only visible to you'}
              </p>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {uploading || isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload to Library
                </>
              )}
            </button>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Documents ({libraryDocuments.length})
              </h3>
            </div>

            {libraryDocuments.length === 0 ? (
              <div className="text-center py-12">
                <Library className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No documents in library yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Upload your first document to get started
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {libraryDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {doc.file_name || 'Untitled Document'}
                        </h4>
                        {doc.is_public ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>

                      {doc.content && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {doc.content.substring(0, 150)}
                          {doc.content.length > 150 && '...'}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0 p-1"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">How Memory Library works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-blue-600 dark:text-blue-400">
                <li>Documents are vectorized using OpenAI embeddings</li>
                <li>AI assistants can search and reference these documents</li>
                <li>Public documents are available to all users</li>
                <li>Private documents are only visible to you</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
