export enum TranscriptionStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING', // Processing file locally
  PROCESSING = 'PROCESSING', // Sending to Gemini
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface TranscriptSegment {
  speaker: string;
  originalText: string;
  englishText: string;
  timestamp?: number; // Changed to number (seconds) for calculation, though string representation is fine for display
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  base64?: string; // Optional now
  file?: File; // New field for File API
  fileUri?: string; // New field for Gemini File URI
  duration: number; // Duration in seconds
  durationUnknown?: boolean; // Flag for BUG-03: true when duration could not be determined
}
