import React, { useState, useEffect } from 'react';

const ServerForm = ({ server, onSave, onCancel }) => {
  const electronAPI = window.electronAPI ?? globalThis.electronAPI;
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    host: '',
    user: '',
    port: '22',
    key: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (server) {
      setFormData({
        id: server.id || '',
        name: server.name || '',
        host: server.host || '',
        user: server.user || '',
        port: server.port || '22',
        key: server.key || ''
      });
    }
    setError('');
  }, [server]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.host.trim() || !formData.user.trim()) {
      setError('Host and Username are required.');
      return;
    }

    setError('');
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectKey = async () => {
    try {
  if (!electronAPI) return;
  const keyPath = await electronAPI.selectKeyFile();
  if (keyPath) {
        setFormData(prev => ({
          ...prev,
          key: keyPath
        }));
      }
    } catch (error) {
      console.error('Error selecting key file:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {server ? 'Edit Server' : 'Add New Server'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name (Optional)
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Production Server"
            />
          </div>

          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-2">
              Host <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={formData.host}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 192.168.1.100 or example.com"
            />
          </div>

          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="user"
              name="user"
              value={formData.user}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., root, ubuntu, admin"
            />
          </div>

          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="number"
              id="port"
              name="port"
              value={formData.port}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="22"
              min="1"
              max="65535"
            />
          </div>
        </div>

        <div>
          <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-2">
            SSH Private Key Path
          </label>
          <div className="flex">
            <input
              type="text"
              id="key"
              name="key"
              value={formData.key}
              onChange={handleChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Path to private key file"
            />
            <button
              type="button"
              onClick={handleSelectKey}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-r-md font-medium transition-colors"
            >
              Browse
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Select the private key file for SSH authentication
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            {server ? 'Update Server' : 'Add Server'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServerForm;