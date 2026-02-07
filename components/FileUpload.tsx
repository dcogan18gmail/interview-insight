import React, { useCallback, useState } from 'react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelected: (fileData: FileData) => void;
  disabled: boolean;
}

const MAX_SIZE_MB = 2000; // Increased limit for File API (2GB)

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  disabled,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      setLoading(true);

      // Check type
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        setError('Please upload a valid audio or video file.');
        setLoading(false);
        return;
      }

      // Check size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        setError(
          `File is too large (${sizeMB.toFixed(1)}MB). For this demo, please use files under ${MAX_SIZE_MB}MB.`
        );
        setLoading(false);
        return;
      }

      // Create a temporary video element to extract duration
      const media = document.createElement('video');
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        const duration = media.duration;
        media.remove();

        onFileSelected({
          name: file.name,
          type: file.type,
          size: file.size,
          file: file, // Pass the File object
          duration: duration && isFinite(duration) ? duration : 0,
        });
        setLoading(false);
      };

      media.onerror = () => {
        console.warn('Could not extract duration');
        onFileSelected({
          name: file.name,
          type: file.type,
          size: file.size,
          file: file, // Pass the File object
          duration: 0,
        });
        setLoading(false);
      };

      media.src = URL.createObjectURL(file); // Use ObjectURL instead of reading entire file
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [disabled, processFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="mx-auto mb-8 w-full max-w-2xl">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out ${
          disabled || loading
            ? 'cursor-not-allowed border-gray-300 bg-gray-50 opacity-50'
            : dragActive
              ? 'scale-[1.02] border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50'
        } `}
      >
        <input
          type="file"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={handleChange}
          accept="audio/*,video/*"
          disabled={disabled || loading}
        />

        <div className="pointer-events-none flex flex-col items-center justify-center pb-6 pt-5">
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600"></div>
              <p className="text-sm text-gray-500">Analyzing file...</p>
            </div>
          ) : (
            <>
              <svg
                className={`mb-4 h-12 w-12 ${dragActive ? 'text-indigo-500' : 'text-gray-400'}`}
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm font-medium text-gray-500">
                <span className="font-semibold text-indigo-600">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-gray-400">
                MP3, WAV, MP4, MOV (MAX {MAX_SIZE_MB}MB)
              </p>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 flex animate-pulse items-center rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <svg
            className="mr-2 h-4 w-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
