// Core storage primitives for localStorage persistence layer
// Handles safe reads/writes, schema versioning, migration infrastructure, and storage metrics

import type {
  StorageMeta,
  ProjectMetadata,
  TranscriptData,
  WriteResult,
  ParseResult,
  Migration,
  ProjectStatus,
} from './storageService.types';
import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION } from './storageService.types';

const LOG_PREFIX = '[StorageService]';

// --- Storage availability ---

/**
 * Test localStorage availability with a write/read/delete cycle.
 * Returns false (not throw) if localStorage is unavailable (e.g., private browsing).
 */
export function isStorageAvailable(): boolean {
  const testKey = '__storage_test__';
  try {
    localStorage.setItem(testKey, 'test');
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return retrieved === 'test';
  } catch {
    return false;
  }
}

// --- Quota detection ---

/**
 * Cross-browser detection of quota exceeded errors.
 * Checks DOMException code 22, code 1014, and known error names.
 */
function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) {
    return false;
  }
  return (
    err.code === 22 ||
    err.code === 1014 ||
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

// --- Safe write ---

/**
 * Wrap localStorage.setItem with structured error handling.
 * Returns a discriminated union WriteResult instead of throwing.
 */
export function safeWrite(key: string, value: string): WriteResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (err: unknown) {
    if (isQuotaExceededError(err)) {
      return {
        ok: false,
        error: 'quota_exceeded',
        message:
          'Storage is full. Please delete some projects to free up space.',
      };
    }
    if (err instanceof DOMException) {
      return {
        ok: false,
        error: 'storage_unavailable',
        message:
          'Unable to save data. Your browser may be in private browsing mode.',
      };
    }
    return {
      ok: false,
      error: 'unknown',
      message: 'An unexpected error occurred while saving data.',
    };
  }
}

// --- Safe read ---

/**
 * Safe localStorage read with JSON parsing and validation.
 * On corruption: logs warning, removes corrupted key, returns null.
 * On missing key: returns null.
 */
export function safeRead<T>(
  key: string,
  validate: (raw: unknown) => ParseResult<T>
): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(
      `${LOG_PREFIX} Corrupted JSON in key "${key}", removing. Raw length: ${raw.length}`
    );
    localStorage.removeItem(key);
    return null;
  }

  const result = validate(parsed);
  if (!result.ok) {
    console.warn(
      `${LOG_PREFIX} Validation failed for key "${key}": ${result.error}. Removing corrupted data.`
    );
    localStorage.removeItem(key);
    return null;
  }

  return result.data;
}

// --- Validators ---

const VALID_PROJECT_STATUSES: ReadonlySet<ProjectStatus> = new Set([
  'idle',
  'uploading',
  'processing',
  'completed',
  'error',
]);

/**
 * Validate that raw data conforms to StorageMeta shape.
 */
export function validateStorageMeta(raw: unknown): ParseResult<StorageMeta> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Expected object, got ' + typeof raw };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj['schemaVersion'] !== 'number') {
    return {
      ok: false,
      error: 'schemaVersion must be a number',
    };
  }
  if (typeof obj['lastUpdated'] !== 'string') {
    return {
      ok: false,
      error: 'lastUpdated must be a string',
    };
  }

  return {
    ok: true,
    data: {
      schemaVersion: obj['schemaVersion'],
      lastUpdated: obj['lastUpdated'],
    },
  };
}

/**
 * Validate that raw data is an array of ProjectMetadata objects.
 * Each item is checked for required fields with correct types.
 */
export function validateProjectMetadataArray(
  raw: unknown
): ParseResult<ProjectMetadata[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'Expected array, got ' + typeof raw };
  }

  for (let i = 0; i < raw.length; i++) {
    const item: unknown = raw[i];

    if (typeof item !== 'object' || item === null) {
      return { ok: false, error: `Item ${i}: expected object` };
    }

    const obj = item as Record<string, unknown>;

    if (typeof obj['id'] !== 'string') {
      return { ok: false, error: `Item ${i}: id must be a string` };
    }
    if (typeof obj['name'] !== 'string') {
      return { ok: false, error: `Item ${i}: name must be a string` };
    }
    if (typeof obj['createdAt'] !== 'string') {
      return { ok: false, error: `Item ${i}: createdAt must be a string` };
    }
    if (typeof obj['updatedAt'] !== 'string') {
      return { ok: false, error: `Item ${i}: updatedAt must be a string` };
    }
    if (
      typeof obj['status'] !== 'string' ||
      !VALID_PROJECT_STATUSES.has(obj['status'] as ProjectStatus)
    ) {
      return { ok: false, error: `Item ${i}: invalid status` };
    }
    if (typeof obj['fileInfo'] !== 'object' || obj['fileInfo'] === null) {
      return { ok: false, error: `Item ${i}: fileInfo must be an object` };
    }

    const fileInfo = obj['fileInfo'] as Record<string, unknown>;
    if (typeof fileInfo['name'] !== 'string') {
      return {
        ok: false,
        error: `Item ${i}: fileInfo.name must be a string`,
      };
    }
    if (typeof fileInfo['type'] !== 'string') {
      return {
        ok: false,
        error: `Item ${i}: fileInfo.type must be a string`,
      };
    }
    if (typeof fileInfo['size'] !== 'number') {
      return {
        ok: false,
        error: `Item ${i}: fileInfo.size must be a number`,
      };
    }
    if (typeof fileInfo['duration'] !== 'number') {
      return {
        ok: false,
        error: `Item ${i}: fileInfo.duration must be a number`,
      };
    }

    if (typeof obj['segmentCount'] !== 'number') {
      return {
        ok: false,
        error: `Item ${i}: segmentCount must be a number`,
      };
    }
  }

  return { ok: true, data: raw as ProjectMetadata[] };
}

/**
 * Validate that raw data conforms to TranscriptData shape.
 * Light validation on segments array (checks existence, not individual segment fields)
 * to support corruption recovery.
 */
export function validateTranscriptData(
  raw: unknown
): ParseResult<TranscriptData> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Expected object, got ' + typeof raw };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj['projectId'] !== 'string') {
    return { ok: false, error: 'projectId must be a string' };
  }
  if (!Array.isArray(obj['segments'])) {
    return { ok: false, error: 'segments must be an array' };
  }
  if (obj['completedAt'] !== null && typeof obj['completedAt'] !== 'string') {
    return { ok: false, error: 'completedAt must be a string or null' };
  }

  return {
    ok: true,
    data: {
      projectId: obj['projectId'],
      segments: obj['segments'] as TranscriptData['segments'],
      completedAt: (obj['completedAt'] as string) ?? null,
    },
  };
}

// --- Migration infrastructure ---

/**
 * Migration definitions. Empty for schema version 1.
 * Add entries here when schema changes are needed:
 *   { version: 2, up: () => { ... migrate from v1 to v2 ... } }
 */
const migrations: Migration[] = [];

/**
 * Run all migrations between currentVersion and targetVersion.
 * Filters, sorts by version, and executes each in order.
 * On failure: logs error and stops at last successful version.
 */
export function runMigrations(
  currentVersion: number,
  targetVersion: number
): void {
  const pending = migrations
    .filter((m) => m.version > currentVersion && m.version <= targetVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    try {
      migration.up();

      const meta: StorageMeta = {
        schemaVersion: migration.version,
        lastUpdated: new Date().toISOString(),
      };
      const result = safeWrite(STORAGE_KEYS.META, JSON.stringify(meta));
      if (!result.ok) {
        console.error(
          `${LOG_PREFIX} Failed to write meta after migration to v${migration.version}: ${result.message}`
        );
        break;
      }

      console.log(
        `${LOG_PREFIX} Migrated schema to version ${migration.version}`
      );
    } catch (err: unknown) {
      console.error(
        `${LOG_PREFIX} Migration to v${migration.version} failed:`,
        err
      );
      break;
    }
  }
}

// --- Initialization ---

/**
 * Initialize the storage layer.
 * - Checks localStorage availability
 * - Creates schema meta on first run
 * - Runs migrations if schema version is behind
 * - Warns (but proceeds) if schema version is ahead (future-compatible)
 */
export function initializeStorage(): { available: boolean; error?: string } {
  if (!isStorageAvailable()) {
    return { available: false, error: 'localStorage is not available' };
  }

  const meta = safeRead(STORAGE_KEYS.META, validateStorageMeta);

  if (meta === null) {
    // Fresh install: write initial schema meta
    const initialMeta: StorageMeta = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    const result = safeWrite(STORAGE_KEYS.META, JSON.stringify(initialMeta));
    if (!result.ok) {
      return { available: false, error: result.message };
    }
    return { available: true };
  }

  if (meta.schemaVersion < CURRENT_SCHEMA_VERSION) {
    runMigrations(meta.schemaVersion, CURRENT_SCHEMA_VERSION);
  } else if (meta.schemaVersion > CURRENT_SCHEMA_VERSION) {
    console.warn(
      `${LOG_PREFIX} Unknown schema version ${meta.schemaVersion}, expected ${CURRENT_SCHEMA_VERSION}. Data may be from a newer app version.`
    );
  }

  return { available: true };
}

// --- Storage metrics ---

/**
 * Calculate total localStorage usage in bytes.
 * Each character is 2 bytes (UTF-16 encoding).
 */
export function getStorageUsageBytes(): number {
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        totalBytes += (key.length + value.length) * 2;
      }
    }
  }
  return totalBytes;
}

/**
 * Calculate total localStorage usage in megabytes, rounded to 2 decimal places.
 */
export function getStorageUsageMB(): number {
  return Math.round((getStorageUsageBytes() / (1024 * 1024)) * 100) / 100;
}
