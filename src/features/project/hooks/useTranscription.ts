// Thin re-export for backward compatibility.
// Real implementation lives in src/contexts/TranscriptionContext.tsx.
export {
  useTranscriptionState,
  useTranscriptionActions,
} from '@/contexts/TranscriptionContext';

// Re-export types that consumers may need
export type { TranscriptionState } from '@/contexts/TranscriptionContext';
