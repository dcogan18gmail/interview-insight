import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import TranscriptView from './components/TranscriptView';
import LoadingState from './components/LoadingState';
import { FileData, TranscriptSegment, TranscriptionStatus } from './types';
import { generateTranscript, uploadFile } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentSegment, setCurrentSegment] = useState<TranscriptSegment | null>(null);

  const handleFileSelected = (data: FileData) => {
    setFileData(data);
    setStatus(TranscriptionStatus.IDLE);
    setErrorMessage(null);
    setProgress(0);
    setCurrentSegment(null);
  };

  const handleStartTranscription = async () => {
    if (!fileData) return;

    setStatus(TranscriptionStatus.UPLOADING);
    setErrorMessage(null);
    setProgress(0);

    try {
      // 1. Upload File if needed (if we have a File object)
      let fileUri = fileData.fileUri;

      if (!fileUri && fileData.file) {
        fileUri = await uploadFile(fileData.file, (pct) => {
          setProgress(pct);
        });
      } else if (!fileUri && fileData.base64) {
        // Fallback for legacy small files if we still supported them, 
        // but we are moving to File API. 
        // Ideally we should upload the base64 as a blob if we wanted to support it,
        // but for now let's assume we always have file or fileUri.
        throw new Error("No file object found for upload.");
      }

      if (!fileUri) {
        throw new Error("Failed to get file URI.");
      }

      setStatus(TranscriptionStatus.PROCESSING);
      setProgress(0);

      // 2. Generate Transcript
      const result = await generateTranscript(
        fileUri,
        fileData.type,
        fileData.duration,
        (pct, segment) => {
          setProgress(pct);
          if (segment) setCurrentSegment(segment);
        }
      );
      setTranscript(result);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(TranscriptionStatus.ERROR);
      setErrorMessage(error instanceof Error ? error.message : "An error occurred while processing the file.");
    }
  };

  const handleReset = () => {
    setStatus(TranscriptionStatus.IDLE);
    setFileData(null);
    setTranscript([]);
    setErrorMessage(null);
    setProgress(0);
    setCurrentSegment(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Interview Insight</h1>
              <p className="text-xs text-slate-500 font-medium">AI-Powered Transcription</p>
            </div>
          </div>

          {status === TranscriptionStatus.COMPLETED && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-600 hover:text-indigo-600 font-medium transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              New Transcription
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Hero Section - Only show when idle or uploading */}
        {status === TranscriptionStatus.IDLE && !fileData && (
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Turn Interviews into Text <span className="text-indigo-600">Instantly</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Upload your audio or video interview files. Our AI detects the language, translates it to English, and formats it by speaker.
            </p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col items-center">

          {/* File Upload Stage */}
          {status === TranscriptionStatus.IDLE && (
            <div className="w-full max-w-2xl animate-fade-in">
              {!fileData ? (
                <FileUpload onFileSelected={handleFileSelected} disabled={false} />
              ) : (
                <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-6 w-full text-center">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3-2 3 2zm0 0v-8"></path></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 truncate mb-1">{fileData.name}</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {(fileData.size / (1024 * 1024)).toFixed(2)} MB • {Math.round(fileData.duration)}s • {fileData.type}
                  </p>

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setFileData(null)}
                      className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStartTranscription}
                      className="px-6 py-2.5 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
                    >
                      Generate Transcript
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Stage */}
          {(status === TranscriptionStatus.PROCESSING || status === TranscriptionStatus.UPLOADING) && (
            <LoadingState
              progress={progress}
              currentSegment={currentSegment}
              status={status} // Pass status to show "Uploading..." vs "Processing..."
            />
          )}

          {/* Error Stage */}
          {status === TranscriptionStatus.ERROR && (
            <div className="w-full max-w-2xl bg-red-50 border border-red-100 rounded-xl p-8 text-center animate-fade-in">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Failed</h3>
              <p className="text-gray-600 mb-6">{errorMessage || "Something went wrong."}</p>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results Stage */}
          {status === TranscriptionStatus.COMPLETED && (
            <TranscriptView transcript={transcript} />
          )}

        </div>
      </main>
    </div>
  );
};

export default App;