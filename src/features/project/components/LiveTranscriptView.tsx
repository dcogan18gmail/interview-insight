import React from 'react';
import { TranscriptSegment } from '@/types';
import { useAutoScroll } from '@/features/project/hooks/useAutoScroll';

// --- Types ---

interface LiveTranscriptViewProps {
  segments: TranscriptSegment[];
  staleSegments?: TranscriptSegment[]; // Dimmed old segments during re-transcription
  isStreaming: boolean; // Whether transcription is actively in progress
}

// --- Helpers ---

function formatTimestampMmSs(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Sub-components ---

interface SegmentRowProps {
  segment: TranscriptSegment;
}

const SegmentRow: React.FC<SegmentRowProps> = ({ segment }) => {
  const isTranslated =
    segment.originalText.trim().toLowerCase() !==
    segment.englishText.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-4">
      {/* Timestamp */}
      <div className="w-14 flex-shrink-0 pt-1">
        <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-400">
          {formatTimestampMmSs(segment.timestamp)}
        </span>
      </div>

      {/* Speaker badge */}
      <div className="w-28 flex-shrink-0 pt-0.5">
        <span className="inline-block max-w-full truncate rounded bg-indigo-100 px-2 py-1 text-xs font-bold uppercase text-indigo-700">
          {segment.speaker}
        </span>
      </div>

      {/* Text */}
      <div className="flex-grow">
        <p className="text-base leading-relaxed text-slate-800">
          {segment.englishText}
        </p>
        {isTranslated && (
          <p className="mt-1 text-sm italic text-slate-400">
            {segment.originalText}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Component ---

const LiveTranscriptView: React.FC<LiveTranscriptViewProps> = ({
  segments,
  staleSegments,
  isStreaming,
}) => {
  const { scrollContainerRef, sentinelRef, isAtBottom, scrollToBottom } =
    useAutoScroll([segments.length]);

  return (
    <div className="relative h-full">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto">
        {/* Stale segments (dimmed) if re-transcribing */}
        {staleSegments?.map((seg, i) => (
          <div key={`stale-${i}`} className="opacity-40">
            <SegmentRow segment={seg} />
          </div>
        ))}

        {/* Live segments with fade-in */}
        {segments.map((seg, i) => {
          const isLatest = isStreaming && i === segments.length - 1;
          return (
            <div
              key={`live-${i}-${seg.timestamp}`}
              className={`animate-fade-in-fast ${isLatest ? 'animate-shimmer' : ''}`}
            >
              <SegmentRow segment={seg} />
            </div>
          );
        })}

        {/* Sentinel for auto-scroll detection */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Jump to latest pill */}
      {!isAtBottom && isStreaming && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg transition-all hover:bg-indigo-700"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
};

export default LiveTranscriptView;
