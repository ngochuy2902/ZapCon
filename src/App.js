import React, { useState, useEffect, useCallback } from 'react';
import ServerList from './components/ServerList.js';
import ServerForm from './components/ServerForm.js';
import Settings from './components/Settings.js';
import Notification from './components/Notification.js';
import ConfirmDialog from './components/ConfirmDialog.js';
import './App.css';

function App() {
  const [servers, setServers] = useState([]);
  const [config, setConfig] = useState({ terminalPath: '' });
  const [activeTab, setActiveTab] = useState('servers');
  const [editingServer, setEditingServer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getElectronAPI = () => window.electronAPI ?? globalThis.electronAPI;

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;
    try {
      const [serverData, configData] = await Promise.all([
        electronAPI.getServers(),
        electronAPI.getConfig()
      ]);
      setServers(serverData);
      setConfig(configData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSaveServer = async (serverData) => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;
    try {
      await electronAPI.saveServer(serverData);
      await loadData(); // Reload data
      setShowForm(false);
      setEditingServer(null);
      showNotification('Server saved successfully.', 'success');
    } catch (error) {
      console.error('Error saving server:', error);
      showNotification('Failed to save server. Please try again.', 'error');
    }
  };

  const requestDeleteServer = (server) => {
    setConfirmDelete(server);
  };

  const performDeleteServer = async () => {
    if (!confirmDelete) return;
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;
    try {
      setIsDeleting(true);
      await electronAPI.deleteServer(confirmDelete.id);
      await loadData();
      showNotification('Server deleted successfully.', 'success');
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting server:', error);
      showNotification('Failed to delete server. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConnectServer = async (id) => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;
    try {
      const success = await electronAPI.connectServer(id);
      if (!success) {
        showNotification('Unable to connect to the server. Please verify your configuration.', 'error');
      }
    } catch (error) {
      console.error('Error connecting to server:', error);
      showNotification('An error occurred while connecting to the server.', 'error');
    }
  };

  const handleEditServer = (server) => {
    setEditingServer(server);
    setShowForm(true);
  };

  const handleSaveConfig = async (configData) => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) {
      throw new Error('Electron API is unavailable.');
    }
    try {
      await electronAPI.saveConfig(configData);
      setConfig(configData);
      showNotification('Settings saved successfully.', 'success');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('Failed to save settings. Please try again.', 'error');
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <img 
              src={process.env.PUBLIC_URL + "/logo.png"} 
              alt="ZapCon Logo" 
              className="w-12 h-12 mr-4 rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">ZapCon</h1>
              <p className="text-gray-600">SSH Connection Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('servers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'servers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Servers
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'servers' && (
            <div className="p-6">
              {!showForm ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Server Connections
                    </h2>
                    <button
                      onClick={() => {
                        setEditingServer(null);
                        setShowForm(true);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Add Server
                    </button>
                  </div>
                  <ServerList
                    servers={servers}
                    onConnect={handleConnectServer}
                    onEdit={handleEditServer}
                    onDelete={requestDeleteServer}
                  />
                </>
              ) : (
                <ServerForm
                  server={editingServer}
                  onSave={handleSaveServer}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingServer(null);
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <Settings config={config} onSave={handleSaveConfig} />
            </div>
          )}
        </div>
      </div>
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Server"
        message={confirmDelete ? `Are you sure you want to delete ${confirmDelete.name || `${confirmDelete.user}@${confirmDelete.host}`}?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={performDeleteServer}
        onCancel={() => { if (!isDeleting) setConfirmDelete(null); }}
        busy={isDeleting}
      />
    </div>
  );
}

export default App;