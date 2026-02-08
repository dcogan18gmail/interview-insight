import { useNavigate } from 'react-router';
import { useSettings } from '@/contexts/SettingsContext';

interface OnboardingStep {
  number: number;
  title: string;
  description: string;
  done: boolean;
  action?: { label: string; to: string };
}

export default function OnboardingView() {
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();

  const steps: OnboardingStep[] = [
    {
      number: 1,
      title: 'Add your API key',
      description:
        'Configure your Gemini API key in Settings to enable transcription.',
      done: settingsState.apiKeyConfigured,
      action: { label: 'Open Settings', to: '/settings' },
    },
    {
      number: 2,
      title: 'Upload a recording',
      description:
        'Upload an audio or video file from an interview to transcribe.',
      done: false,
      action: { label: 'New Project', to: '/project/new' },
    },
    {
      number: 3,
      title: 'Get your transcript',
      description:
        'Gemini will process the recording and produce a structured transcript with translations.',
      done: false,
    },
  ];

  // Find the first incomplete step for CTA
  const firstIncomplete = steps.find((s) => !s.done);

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-slate-800">Get Started</h2>
        <p className="mb-8 text-slate-500">
          Set up your first transcription in three simple steps.
        </p>

        <div className="mb-8 space-y-4 text-left">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              {/* Step indicator */}
              <div className="flex-shrink-0">
                {step.done ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                    {step.number}
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${step.done ? 'text-green-700' : 'text-slate-800'}`}
                >
                  {step.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA for first incomplete step */}
        {firstIncomplete?.action && (
          <button
            onClick={() => navigate(firstIncomplete.action!.to)}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            {firstIncomplete.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
