import React, { useState, useEffect } from "react";
import {
  encryptApiKey,
  validateGeminiApiKey,
  getOrCreatePassphrase,
  hasStoredKey,
  clearStoredKey,
} from "../services/cryptoService";

interface SettingsProps {
  onClose: () => void;
  onKeyChanged: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, onKeyChanged }) => {
  const [apiKey, setApiKey] = useState("");
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
      setError("Please enter an API key");
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);

    const result = await validateGeminiApiKey(trimmedKey);

    if (!result.valid) {
      setError(result.error || "Invalid API key");
      setIsValidating(false);
      return;
    }

    try {
      const passphrase = getOrCreatePassphrase();
      const encrypted = await encryptApiKey(trimmedKey, passphrase);
      localStorage.setItem("gemini_encrypted_key", encrypted);
    } catch {
      setError("Failed to encrypt and save key. Please try again.");
      setIsValidating(false);
      return;
    }

    setApiKey("");
    setKeyExists(true);
    setSuccess("API key saved successfully!");
    setIsValidating(false);
    onKeyChanged();
  };

  const handleClearKey = () => {
    clearStoredKey();
    setKeyExists(false);
    setSuccess(null);
    onKeyChanged();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* API Key Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Gemini API Key
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            Enter your own Gemini API key to use this app. Your key is encrypted
            and stored locally in your browser.
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-4"
          >
            Get a key from Google AI Studio &rarr;
          </a>

          {/* Key Status */}
          {keyExists && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4">
              <span className="text-sm font-medium text-green-700">
                Key configured
              </span>
              <button
                onClick={handleClearKey}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear Key
              </button>
            </div>
          )}

          {/* Input */}
          <input
            type="password"
            placeholder="Enter your Gemini API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm mb-3 outline-none"
          />

          {/* Error */}
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          {/* Success */}
          {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

          {/* Save Button */}
          <button
            onClick={handleSaveKey}
            disabled={isValidating}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? "Validating..." : "Validate & Save Key"}
          </button>
        </div>

        {/* Footer Security Note */}
        <p className="text-xs text-slate-400 mt-6 text-center">
          Your key is encrypted with AES-256-GCM and stored only in your
          browser. It is never sent to our servers.
        </p>
      </div>
    </div>
  );
};

export default Settings;
