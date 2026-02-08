// Storage layer type definitions for localStorage persistence
// All types for schema versioning, project metadata, transcript data, and safe I/O results

import type { TranscriptSegment } from '@/types';

// --- Schema versioning ---

export const CURRENT_SCHEMA_VERSION = 2;

export interface StorageMeta {
  schemaVersion: number;
  lastUpdated: string; // ISO 8601 timestamp
}

// --- Storage key patterns ---

export const STORAGE_KEYS = {
  META: 'ii:meta',
  PROJECTS: 'ii:projects',
  transcript: (id: string) => `ii:transcript:${id}`,
} as const;

// --- Project types ---

export type ProjectStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface FileInfo {
  name: string;
  type: string;
  size: number;
  duration: number;
}

export interface ProjectMetadata {
  id: string; // UUID via crypto.randomUUID()
  name: string;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  status: ProjectStatus;
  fileInfo: FileInfo;
  segmentCount: number; // Summary stat to avoid loading full transcript
  // Extended metadata fields (v2) -- user-editable, start blank
  interviewee: string | null; // Interviewee/subject name
  interviewer: string | null; // Interviewer name
  participants: string | null; // Other participants (free text)
  interviewDate: string | null; // Date of interview (ISO 8601 or user-entered string)
  originalLanguage: string | null; // Original language of the interview
  location: string | null; // Location where interview took place
}

// --- Transcript types ---

export interface TranscriptData {
  projectId: string;
  segments: TranscriptSegment[];
  completedAt: string | null;
  fileUri?: string; // Gemini file URI for resume-without-re-upload (valid 48h)
}

// --- Safe I/O result types ---

export type WriteResult =
  | { ok: true }
  | {
      ok: false;
      error: 'quota_exceeded' | 'storage_unavailable' | 'unknown';
      message: string;
    };

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// --- Migration types ---

export interface Migration {
  version: number;
  up: () => void;
}
