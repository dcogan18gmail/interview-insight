import { useState, useEffect } from 'react';
import {
  encryptApiKey,
  validateGeminiApiKey,
  getOrCreatePassphrase,
  hasStoredKey,
  clearStoredKey,
} from '@/services/cryptoService';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranscriptionState } from '@/contexts/TranscriptionContext';

export default function ApiKeyForm() {
  const { dispatch } = useSettings();
  const transcriptionState = useTranscriptionState();
  const isTranscriptionActive = transcriptionState.isTranscribing;
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keyExists, setKeyExists] = useState(false);

  useEffect(() => {
    setKeyExists(hasStoredKey());
  }, []);

  const handleSaveKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);

    const result = await validateGeminiApiKey(trimmedKey);

    if (!result.valid) {
      setError(result.error ?? 'Invalid API key');
      setIsValidating(false);
      return;
    }

    try {
      const passphrase = getOrCreatePassphrase();
      const encrypted = await encryptApiKey(trimmedKey, passphrase);
      localStorage.setItem('gemini_encrypted_key', encrypted);
    } catch {
      setError('Failed to encrypt and save key. Please try again.');
      setIsValidating(false);
      return;
    }

    setApiKey('');
    setKeyExists(true);
    setSuccess('API key saved successfully!');
    setIsValidating(false);
    dispatch({ type: 'KEY_SAVED' });
  };

  const handleClearKey = () => {
    clearStoredKey();
    setKeyExists(false);
    setSuccess(null);
    dispatch({ type: 'KEY_CLEARED' });
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Gemini API Key
      </h3>
      <p className="mb-3 text-sm text-slate-500">
        Enter your own Gemini API key to use this app. Your key is encrypted and
        stored locally in your browser.
      </p>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        Get a key from Google AI Studio &rarr;
      </a>

      {/* Key Status */}
      {keyExists && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
          <span className="text-sm font-medium text-green-700">
            Key configured
          </span>
          <button
            onClick={handleClearKey}
            disabled={isTranscriptionActive}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Key
          </button>
        </div>
      )}

      {/* Active transcription warning */}
      {isTranscriptionActive && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Warning:</span> A transcription is
            currently in progress. Changing or removing your API key will cause
            it to fail.
          </p>
        </div>
      )}

      {/* Input */}
      <input
        type="password"
        placeholder="Enter your Gemini API key..."
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
      />

      {/* Error */}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Success */}
      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

      {/* Save Button */}
      <button
        onClick={handleSaveKey}
        disabled={isValidating}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isValidating ? 'Validating...' : 'Validate & Save Key'}
      </button>

      {/* Security Note */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Your key is encrypted with AES-256-GCM and stored only in your browser.
        It is never sent to our servers.
      </p>
    </div>
  );
}
