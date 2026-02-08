import { useNavigate } from 'react-router';
import { getStorageReport } from '@/services/storageService';
import ApiKeyForm from '@/features/settings/components/ApiKeyForm';

export default function SettingsPage() {
  const navigate = useNavigate();
  const report = getStorageReport();

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Dashboard
      </button>

      <h2 className="mb-8 text-2xl font-bold text-slate-900">Settings</h2>

      {/* API Key Section */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ApiKeyForm />
      </div>

      {/* Storage Report */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Storage
        </h3>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Usage</span>
            <span className="font-medium">{report.usageMB.toFixed(2)} MB</span>
          </div>
          <div className="flex justify-between">
            <span>Projects</span>
            <span className="font-medium">{report.projectCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span
              className={`font-medium ${report.available ? 'text-green-600' : 'text-red-600'}`}
            >
              {report.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
