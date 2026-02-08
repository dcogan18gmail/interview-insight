import React, { useState, useEffect } from 'react';
import FileUpload from '@/features/project/components/FileUpload';
import TranscriptView from '@/features/project/components/TranscriptView';
import LoadingState from '@/features/project/components/LoadingState';
import Settings from '@/features/settings/components/Settings';
import { FileData, TranscriptSegment, TranscriptionStatus } from '@/types';
import { generateTranscript, uploadFile } from '@/services/geminiService';
import { hasStoredKey, getDecryptedKey } from '@/services/cryptoService';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';

const App: React.FC = () => {
  const [status, setStatus] = useState<TranscriptionStatus>(
    TranscriptionStatus.IDLE
  );
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentSegment, setCurrentSegment] =
    useState<TranscriptSegment | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  useEffect(() => {
    setApiKeyConfigured(hasStoredKey());
  }, []);

  const handleFileSelected = (data: FileData) => {
    setFileData(data);
    setStatus(TranscriptionStatus.IDLE);
    setErrorMessage(null);
    setProgress(0);
    setCurrentSegment(null);
  };

  const handleStartTranscription = async () => {
    if (!fileData) return;
    if (!apiKeyConfigured) {
      setShowSettings(true);
      return;
    }

    setStatus(TranscriptionStatus.UPLOADING);
    setErrorMessage(null);
    setProgress(0);

    try {
      // Decrypt user's API key for BYOK
      const apiKey = await getDecryptedKey();
      if (!apiKey) {
        throw new Error(
          'No API key configured. Please add your Gemini API key in Settings.'
        );
      }

      // 1. Upload File if needed (if we have a File object)
      let fileUri = fileData.fileUri;

      if (!fileUri && fileData.file) {
        fileUri = await uploadFile(apiKey, fileData.file, (pct: number) => {
          setProgress(pct);
        });
      } else if (!fileUri && fileData.base64) {
        // Fallback for legacy small files if we still supported them,
        // but we are moving to File API.
        // Ideally we should upload the base64 as a blob if we wanted to support it,
        // but for now let's assume we always have file or fileUri.
        throw new Error('No file object found for upload.');
      }

      if (!fileUri) {
        throw new Error('Failed to get file URI.');
      }

      setStatus(TranscriptionStatus.PROCESSING);
      setProgress(0);

      // 2. Generate Transcript
      const result = await generateTranscript(
        apiKey,
        fileUri,
        fileData.type,
        fileData.duration,
        (pct: number, segment: TranscriptSegment | null) => {
          setProgress(pct);
          if (segment) setCurrentSegment(segment);
        }
      );
      setTranscript(result);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(TranscriptionStatus.ERROR);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'An error occurred while processing the file.'
      );
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
    <SettingsProvider>
      <ProjectsProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-indigo-600 p-2 shadow-md shadow-indigo-200">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-900">
                    Interview Insight
                  </h1>
                  <p className="text-xs font-medium text-slate-500">
                    AI-Powered Transcription
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {status === TranscriptionStatus.COMPLETED && (
                  <button
                    onClick={handleReset}
                    className="flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      ></path>
                    </svg>
                    New Transcription
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                  title="Settings"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-6 py-10">
            {/* Hero Section - Only show when idle or uploading */}
            {status === TranscriptionStatus.IDLE && !fileData && (
              <div className="animate-fade-in mb-12 text-center">
                <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900">
                  Turn Interviews into Text{' '}
                  <span className="text-indigo-600">Instantly</span>
                </h2>
                <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600">
                  Upload your audio or video interview files. Our AI detects the
                  language, translates it to English, and formats it by speaker.
                </p>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-col items-center">
              {/* API Key Required Prompt */}
              {status === TranscriptionStatus.IDLE && !apiKeyConfigured && (
                <div className="animate-fade-in mb-8 w-full max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                  <h3 className="mb-2 text-lg font-semibold text-amber-900">
                    API Key Required
                  </h3>
                  <p className="mb-4 text-amber-700">
                    To get started, you&apos;ll need to add your Gemini API key.
                  </p>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
                  >
                    Open Settings
                  </button>
                </div>
              )}

              {/* File Upload Stage */}
              {status === TranscriptionStatus.IDLE && (
                <div className="animate-fade-in w-full max-w-2xl">
                  {!fileData ? (
                    <FileUpload
                      onFileSelected={handleFileSelected}
                      disabled={false}
                    />
                  ) : (
                    <div className="w-full rounded-xl border border-indigo-100 bg-white p-6 text-center shadow-md">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
                        <svg
                          className="h-8 w-8 text-indigo-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3-2 3 2zm0 0v-8"
                          ></path>
                        </svg>
                      </div>
                      <h3 className="mb-1 truncate text-lg font-semibold text-gray-800">
                        {fileData.name}
                      </h3>
                      <p className="mb-6 text-sm text-gray-500">
                        {(fileData.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                        {Math.round(fileData.duration)}s • {fileData.type}
                      </p>

                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => setFileData(null)}
                          className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleStartTranscription}
                          className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300"
                        >
                          Generate Transcript
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Processing Stage */}
              {(status === TranscriptionStatus.PROCESSING ||
                status === TranscriptionStatus.UPLOADING) && (
                <LoadingState
                  progress={progress}
                  currentSegment={currentSegment}
                  status={status} // Pass status to show "Uploading..." vs "Processing..."
                />
              )}

              {/* Error Stage */}
              {status === TranscriptionStatus.ERROR && (
                <div className="animate-fade-in w-full max-w-2xl rounded-xl border border-red-100 bg-red-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <svg
                      className="h-8 w-8 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    Processing Failed
                  </h3>
                  <p className="mb-6 text-gray-600">
                    {errorMessage || 'Something went wrong.'}
                  </p>
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
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

          {showSettings && (
            <Settings
              onClose={() => setShowSettings(false)}
              onKeyChanged={() => setApiKeyConfigured(hasStoredKey())}
            />
          )}
        </div>
      </ProjectsProvider>
    </SettingsProvider>
  );
};

export default App;
