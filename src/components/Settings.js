import React, { useState, useEffect } from 'react';

const Settings = ({ config, onSave }) => {
  const electronAPI = window.electronAPI ?? globalThis.electronAPI;
  const [formData, setFormData] = useState({
    terminalPath: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      terminalPath: config.terminalPath || ''
    });
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      // Notification is handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectTerminal = async () => {
    try {
      if (!electronAPI) return;
      const terminalPath = await electronAPI.selectTerminal();
      if (terminalPath) {
        setFormData(prev => ({
          ...prev,
          terminalPath: terminalPath
        }));
      }
    } catch (error) {
      console.error('Error selecting terminal:', error);
    }
  };

  const getDefaultTerminalHint = () => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) {
      return 'Windows: auto-detects PowerShell, Command Prompt, or Git Bash (e.g., C:\\Windows\\System32\\cmd.exe or C:\\Program Files\\Git\\bin\\bash.exe)';
    } else if (platform.includes('mac')) {
      return 'macOS: /Applications/Utilities/Terminal.app/Contents/MacOS/Terminal';
    } else {
      return 'Linux: /usr/bin/gnome-terminal or /usr/bin/konsole';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Settings</h2>
        <p className="text-gray-600">Configure your terminal and application preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Terminal Configuration</h3>
          
          <div>
            <label htmlFor="terminalPath" className="block text-sm font-medium text-gray-700 mb-2">
              Terminal Application Path
            </label>
            <div className="flex">
              <input
                type="text"
                id="terminalPath"
                name="terminalPath"
                value={formData.terminalPath}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Path to your terminal application"
              />
              <button
                type="button"
                onClick={handleSelectTerminal}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-r-md font-medium transition-colors"
              >
                Browse
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              <strong>Default paths:</strong><br />
              {getDefaultTerminalHint()}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                About Terminal Configuration
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  The terminal path is used to launch SSH connections. Make sure to select a terminal application 
                  that supports SSH commands. If left empty, the system default terminal will be used.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 items-center gap-4">
          {isSaving && (
            <span className="text-sm text-gray-500">Saving…</span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* System Information */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <span className="font-medium text-gray-700">Platform:</span>
            <span className="ml-2 text-gray-600">{navigator.platform}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="font-medium text-gray-700">User Agent:</span>
            <span className="ml-2 text-gray-600 truncate block">
              {navigator.userAgent.split(' ').slice(0, 3).join(' ')}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;