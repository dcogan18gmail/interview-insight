import { useState, useRef, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectsContext';
import type { ProjectMetadata } from '@/services/storageService.types';

interface MetadataPanelProps {
  projectId: string;
}

// --- Editable field sub-component ---

interface MetadataFieldProps {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void;
}

function MetadataField({ label, value, onSave }: MetadataFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(value ?? '');
    setEditing(true);
  };

  const save = () => {
    const trimmed = draft.trim();
    // Empty string -> null to maintain "needs info" convention
    onSave(trimmed === '' ? null : trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={save}
            className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label={label}
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="w-full cursor-pointer rounded px-1.5 py-0.5 text-left text-sm transition-colors hover:bg-slate-100"
            aria-label={`Edit ${label}`}
          >
            {value !== null ? (
              <span className="text-slate-700">{value}</span>
            ) : (
              <span className="text-xs italic text-amber-500">Needs info</span>
            )}
          </button>
        )}
      </dd>
    </div>
  );
}

// --- Read-only field sub-component ---

interface ReadOnlyFieldProps {
  label: string;
  children: React.ReactNode;
}

function ReadOnlyField({ label, children }: ReadOnlyFieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{children}</dd>
    </div>
  );
}

// --- Status badge ---

function StatusBadge({ status }: { status: ProjectMetadata['status'] }) {
  const styles: Record<ProjectMetadata['status'], string> = {
    completed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    uploading: 'bg-blue-100 text-blue-700',
    processing: 'bg-blue-100 text-blue-700',
    idle: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-amber-100 text-amber-700',
    interrupted: 'bg-orange-100 text-orange-700',
  };

  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// --- Utility formatters ---

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// --- Editable metadata field keys ---

type EditableField =
  | 'interviewee'
  | 'interviewer'
  | 'participants'
  | 'interviewDate'
  | 'originalLanguage'
  | 'location';

const EDITABLE_FIELDS: { key: EditableField; label: string }[] = [
  { key: 'interviewee', label: 'Interviewee' },
  { key: 'interviewer', label: 'Interviewer' },
  { key: 'participants', label: 'Participants' },
  { key: 'interviewDate', label: 'Interview Date' },
  { key: 'originalLanguage', label: 'Language' },
  { key: 'location', label: 'Location' },
];

// --- Main component ---

export default function MetadataPanel({ projectId }: MetadataPanelProps) {
  const { state, updateProject } = useProjects();
  const project = state.projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-400">Project not found</p>
      </aside>
    );
  }

  const handleFieldSave = (field: EditableField, value: string | null) => {
    updateProject({ ...project, [field]: value });
  };

  return (
    <aside className="w-72 flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4">
      {/* Editable Details section */}
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Details
      </h3>
      <dl className="space-y-3">
        {EDITABLE_FIELDS.map(({ key, label }) => (
          <MetadataField
            key={key}
            label={label}
            value={project[key] ?? null}
            onSave={(val) => handleFieldSave(key, val)}
          />
        ))}
      </dl>

      {/* Read-only Info section */}
      <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Info
      </h3>
      <dl className="space-y-3">
        <ReadOnlyField label="Status">
          <StatusBadge status={project.status} />
        </ReadOnlyField>

        <ReadOnlyField label="Created">
          {new Date(project.createdAt).toLocaleDateString()}
        </ReadOnlyField>

        <ReadOnlyField label="Last Updated">
          {new Date(project.updatedAt).toLocaleDateString()}
        </ReadOnlyField>

        <ReadOnlyField label="File Name">
          <span className="block truncate">{project.fileInfo.name}</span>
        </ReadOnlyField>

        <ReadOnlyField label="File Size">
          {formatFileSize(project.fileInfo.size)}
        </ReadOnlyField>

        <ReadOnlyField label="Duration">
          {formatDuration(project.fileInfo.duration)}
        </ReadOnlyField>

        <ReadOnlyField label="Segments">{project.segmentCount}</ReadOnlyField>
      </dl>
    </aside>
  );
}
