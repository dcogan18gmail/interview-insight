import React, { useState } from 'react';
import { TranscriptSegment } from '@/types';
import {
  generateDocxBlob,
  saveBlob,
  formatTimestamp,
  type DocxVariant,
} from '@/services/docxExport';

interface TranscriptViewProps {
  transcript: TranscriptSegment[];
  projectName?: string;
}

/** Build a download filename: ProjectName_Variant_YYYY-MM-DD.docx */
function buildFilename(
  projectName: string | undefined,
  variant: string
): string {
  const datePart = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeName = projectName
    ? projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    : 'transcript';
  return `${safeName}_${variant}_${datePart}.docx`;
}

const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  projectName,
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleDownload = async (
    type: 'english' | 'original' | 'combined' | 'all'
  ) => {
    setShowDownloadMenu(false);

    if (type === 'all') {
      const types: Array<{ variant: DocxVariant; filename: string }> = [
        { variant: 'english', filename: buildFilename(projectName, 'english') },
        {
          variant: 'original',
          filename: buildFilename(projectName, 'original'),
        },
        {
          variant: 'combined',
          filename: buildFilename(projectName, 'combined'),
        },
      ];
      for (const { variant, filename } of types) {
        const blob = await generateDocxBlob(transcript, variant);
        saveBlob(blob, filename);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } else {
      const blob = await generateDocxBlob(transcript, type);
      saveBlob(blob, buildFilename(projectName, type));
    }
  };

  const handleCopy = () => {
    const text = transcript
      .map((t) => {
        const isTranslated =
          t.originalText.trim().toLowerCase() !==
          t.englishText.trim().toLowerCase();
        return isTranslated
          ? `[${formatTimestamp(t.timestamp)}] ${t.speaker}:\n(Eng) ${t.englishText}\n(Org) ${t.originalText}`
          : `[${formatTimestamp(t.timestamp)}] ${t.speaker}: ${t.englishText}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(text);
    alert('Transcript copied to clipboard!');
  };

  return (
    <div className="animate-fade-in mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
        <h2 className="flex items-center text-lg font-semibold text-gray-800">
          <svg
            className="mr-2 h-5 w-5 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          Transcription Result
        </h2>
        <div className="relative flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
            Copy
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              Download .docx
              <svg
                className={`ml-2 h-3 w-3 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>

            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowDownloadMenu(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' || e.key === 'Enter') {
                      setShowDownloadMenu(false);
                    }
                  }}
                  aria-label="Close download menu"
                ></div>
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl">
                  <button
                    onClick={() => handleDownload('english')}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    English Only
                  </button>
                  <button
                    onClick={() => handleDownload('original')}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Original Only
                  </button>
                  <button
                    onClick={() => handleDownload('combined')}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Combined
                  </button>
                  <div className="my-1 border-t border-gray-100"></div>
                  <button
                    onClick={() => handleDownload('all')}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                  >
                    Download All (3 Files)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="custom-scrollbar max-h-[600px] space-y-6 overflow-y-auto p-6">
        {transcript.map((segment, index) => {
          // Check if original and english are different (ignoring minor whitespace/case)
          const isTranslated =
            segment.originalText.trim().toLowerCase() !==
            segment.englishText.trim().toLowerCase();

          return (
            <div
              key={index}
              className="group flex flex-col gap-2 sm:flex-row sm:gap-4"
            >
              {/* Timestamp Column */}
              <div className="w-16 flex-shrink-0 pt-1.5">
                <span className="rounded border border-gray-100 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-400">
                  {formatTimestamp(segment.timestamp)}
                </span>
              </div>

              {/* Speaker Column */}
              <div className="w-28 flex-shrink-0 pt-1">
                <span
                  className={`inline-block max-w-full truncate rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                    segment.speaker.toLowerCase().includes('interviewer')
                      ? 'bg-blue-100 text-blue-700'
                      : segment.speaker.toLowerCase().includes('guest')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                  } `}
                >
                  {segment.speaker}
                </span>
              </div>

              {/* Text Column */}
              <div className="flex-grow">
                {/* Primary English Text */}
                <p className="text-base font-medium leading-relaxed text-gray-800">
                  {segment.englishText}
                </p>

                {/* Original Language Subtext (only if translated) */}
                {isTranslated && (
                  <div className="mt-2 border-l-2 border-indigo-100 pl-3">
                    <p className="font-serif text-sm italic text-gray-500">
                      {segment.originalText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between border-t border-gray-100 bg-gray-50 px-6 py-3 text-center text-xs text-gray-400">
        <span>Generated by Gemini 3 Pro</span>
        <span>{transcript.length} segments detected</span>
      </div>
    </div>
  );
};

export default TranscriptView;
