import React from 'react';

const ServerList = ({ servers, onConnect, onEdit, onDelete }) => {
  if (servers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No servers configured</h3>
        <p className="text-gray-500">Get started by adding your first SSH server connection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {servers.map((server) => (
        <div
          key={server.id}
          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900 mr-3">
                  {server.name || `${server.user}@${server.host}`}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  SSH
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex items-center">
                  <span className="font-medium w-16">Host:</span>
                  <span>{server.host}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium w-16">User:</span>
                  <span>{server.user}</span>
                </div>
                {server.port && server.port !== '22' && (
                  <div className="flex items-center">
                    <span className="font-medium w-16">Port:</span>
                    <span>{server.port}</span>
                  </div>
                )}
                {server.key && (
                  <div className="flex items-center">
                    <span className="font-medium w-16">Key:</span>
                    <span className="truncate max-w-xs">{server.key}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => onConnect(server.id)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Connect
              </button>
              <button
                onClick={() => onEdit(server)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(server)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServerList;