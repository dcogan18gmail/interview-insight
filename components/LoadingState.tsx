import React from 'react';
import { TranscriptSegment, TranscriptionStatus } from '../types';

interface LoadingStateProps {
  progress: number;
  currentSegment: TranscriptSegment | null;
  status?: TranscriptionStatus;
}

const LoadingState: React.FC<LoadingStateProps> = ({ progress, currentSegment, status }) => {
  return (
    <div className="w-full max-w-2xl mx-auto text-center py-8 animate-fade-in">

      {/* Status Icon */}
      <div className="relative w-16 h-16 mx-auto mb-6">
        {progress < 100 ? (
          <>
            <div className="absolute inset-0 bg-indigo-100 rounded-full opacity-50 animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
        )}
      </div>

      {/* Status Text */}
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        {status === TranscriptionStatus.UPLOADING ? 'Uploading File...' :
          progress === 0 ? 'Initializing Model...' :
            progress < 100 ? 'Transcribing Interview...' : 'Finalizing...'}
      </h3>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
        <div
          className="bg-indigo-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
          style={{ width: `${Math.max(progress, 5)}%` }}
        >
          <span className="text-[10px] text-white font-bold">{progress}%</span>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 min-h-[100px] flex flex-col items-center justify-center relative overflow-hidden">
        {currentSegment ? (
          <div className="animate-slide-up w-full">
            <div className="flex items-center justify-center mb-2">
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                {currentSegment.speaker}
              </span>
              {currentSegment.timestamp && (
                <span className="text-xs text-gray-400 ml-2 font-mono">
                  {new Date(currentSegment.timestamp * 1000).toISOString().substr(14, 5)}
                </span>
              )}
            </div>
            <p className="text-gray-800 font-medium text-lg leading-relaxed">"{currentSegment.englishText}"</p>
            {currentSegment.originalText !== currentSegment.englishText && (
              <p className="text-gray-400 text-sm italic mt-1">({currentSegment.originalText})</p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">Waiting for audio processing to start...</p>
        )}

        {/* Decorative pulse for "live" feel */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Processing with Gemini 3 Pro • Large files may take a moment to start
      </p>
    </div>
  );
};

export default LoadingState;