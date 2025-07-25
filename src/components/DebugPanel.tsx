/**
 * QR Super Generator - Debug Panel Component
 * 
 * Comprehensive debugging interface showing:
 * - Extension state and variables
 * - Console logs and performance metrics
 * - Test functions and validation
 * - Storage inspection and management
 */

import React, { useState, useEffect, useRef } from 'react';
import { debug } from '../utils/debug';
import { qrService } from '../utils/qr-service';
import { storageService } from '../utils/storage-service';
import { TypeValidator, TEST_QR_DATA } from '../types';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SystemState {
  memory?: {
    used: string;
    total: string;
    limit: string;
  };
  performance: {
    generationCount: number;
    averageTime: number;
    totalTime: number;
  };
  storage: {
    used: number;
    quota: number;
    percentage: number;
  };
  extension: {
    version: string;
    environment: string;
  };
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'state' | 'tests' | 'storage'>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const component = 'DebugPanel';

  useEffect(() => {
    if (isOpen) {
      debug.info(component, '🔧 Debug panel opened');
      loadDebugData();
      
      if (autoRefresh) {
        intervalRef.current = setInterval(loadDebugData, 2000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, autoRefresh]);

  const loadDebugData = async () => {
    try {
      debug.trace(component, '🔄 Refreshing debug data');

      // Get debug data from logger
      const debugData = debug.getDebugData();
      setLogs(debugData.logs);

      // Get system state
      const qrStats = qrService.getStatistics();
      const storageUsage = await storageService.getStorageUsage();
      
      const systemState: SystemState = {
        performance: {
          generationCount: qrStats.totalGenerated,
          averageTime: qrStats.averageGenerationTime,
          totalTime: qrStats.totalGenerationTime
        },
        storage: storageUsage,
        extension: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      };

      // @ts-ignore
      if (performance.memory) {
        // @ts-ignore
        const memory = performance.memory;
        systemState.memory = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        };
      }

      setSystemState(systemState);

      // Get storage data
      const qrHistory = await storageService.getQRHistory();
      const settings = await storageService.getSettings();
      const analytics = await storageService.getAnalytics();

      setStorageData({
        qrHistory: qrHistory.slice(0, 5), // Show only first 5 for UI
        settings,
        analytics,
        totalHistoryCount: qrHistory.length
      });

    } catch (error) {
      debug.error(component, '❌ Failed to load debug data', error as Error);
    }
  };

  const runTests = async () => {
    debug.info(component, '🧪 Running comprehensive tests');
    setIsRunningTests(true);
    setTestResults([]);

    try {
      const results: any[] = [];

      // Test 1: Basic QR Generation
      results.push({ name: 'Basic QR Generation', status: 'running', details: 'Testing basic text QR...' });
      setTestResults([...results]);

      try {
        const basicQR = await qrService.generateQRCode('Test QR Code', { width: 128 });
        results[results.length - 1] = {
          name: 'Basic QR Generation',
          status: 'passed',
          details: `Generated QR with ID: ${basicQR.id}`,
          data: { id: basicQR.id, dataUrlLength: basicQR.dataUrl.length }
        };
      } catch (error) {
        results[results.length - 1] = {
          name: 'Basic QR Generation',
          status: 'failed',
          details: (error as Error).message,
          error: error
        };
      }
      setTestResults([...results]);

      // Test 2: WiFi QR Generation
      results.push({ name: 'WiFi QR Generation', status: 'running', details: 'Testing WiFi QR...' });
      setTestResults([...results]);

      try {
        const wifiQR = await qrService.generateWiFiQR({
          ssid: 'Test Network',
          password: 'testpass123',
          security: 'WPA',
          hidden: false
        });
        results[results.length - 1] = {
          name: 'WiFi QR Generation',
          status: 'passed',
          details: `WiFi QR generated: ${wifiQR.title}`,
          data: { id: wifiQR.id, title: wifiQR.title }
        };
      } catch (error) {
        results[results.length - 1] = {
          name: 'WiFi QR Generation',
          status: 'failed',
          details: (error as Error).message,
          error: error
        };
      }
      setTestResults([...results]);

      // Test 3: Storage Operations
      results.push({ name: 'Storage Operations', status: 'running', details: 'Testing storage...' });
      setTestResults([...results]);

      try {
        const testQR = await qrService.generateQRCode('Storage Test', { width: 64 });
        await storageService.addToHistory(testQR);
        const history = await storageService.getQRHistory();
        const found = history.find(qr => qr.id === testQR.id);
        
        if (found) {
          results[results.length - 1] = {
            name: 'Storage Operations',
            status: 'passed',
            details: `QR stored and retrieved successfully`,
            data: { historyLength: history.length }
          };
        } else {
          throw new Error('QR not found in history after storage');
        }
      } catch (error) {
        results[results.length - 1] = {
          name: 'Storage Operations',
          status: 'failed',
          details: (error as Error).message,
          error: error
        };
      }
      setTestResults([...results]);

      // Test 4: Data Validation
      results.push({ name: 'Data Validation', status: 'running', details: 'Testing validation...' });
      setTestResults([...results]);

      try {
        const validText = TypeValidator.validateQRText('Valid text');
        const invalidText = TypeValidator.validateQRText('');
        const validEmail = TypeValidator.validateEmail('demo@qr-generator.com');
        const invalidEmail = TypeValidator.validateEmail('invalid-email');

        if (validText.isValid && !invalidText.isValid && validEmail.isValid && !invalidEmail.isValid) {
          results[results.length - 1] = {
            name: 'Data Validation',
            status: 'passed',
            details: 'All validation tests passed',
            data: { validText, invalidText, validEmail, invalidEmail }
          };
        } else {
          throw new Error('Validation tests failed');
        }
      } catch (error) {
        results[results.length - 1] = {
          name: 'Data Validation',
          status: 'failed',
          details: (error as Error).message,
          error: error
        };
      }
      setTestResults([...results]);

      // Test 5: Test Data Generation
      results.push({ name: 'Test Data Generation', status: 'running', details: 'Generating test QR codes...' });
      setTestResults([...results]);

      try {
        const testQRs = await qrService.generateTestQRCodes();
        results[results.length - 1] = {
          name: 'Test Data Generation',
          status: 'passed',
          details: `Generated ${testQRs.length} test QR codes`,
          data: { count: testQRs.length, types: testQRs.map(qr => qr.type) }
        };
      } catch (error) {
        results[results.length - 1] = {
          name: 'Test Data Generation',
          status: 'failed',
          details: (error as Error).message,
          error: error
        };
      }
      setTestResults([...results]);

      const passedTests = results.filter(r => r.status === 'passed').length;
      const totalTests = results.length;

      debug.info(component, `✅ Tests completed: ${passedTests}/${totalTests} passed`, {
        results: results.map(r => ({ name: r.name, status: r.status }))
      });

    } catch (error) {
      debug.error(component, '❌ Test execution failed', error as Error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const generateTestData = async () => {
    debug.info(component, '🎲 Generating test data');
    try {
      const testQRs = await qrService.generateTestQRCodes();
      debug.info(component, `✅ Generated ${testQRs.length} test QR codes`);
      
      // Add them to history for testing
      for (const qr of testQRs) {
        await storageService.addToHistory(qr);
      }
      
      loadDebugData(); // Refresh display
    } catch (error) {
      debug.error(component, '❌ Failed to generate test data', error as Error);
    }
  };

  const clearLogs = () => {
    debug.clearLogs();
    setLogs([]);
    debug.info(component, '🧹 Logs cleared from debug panel');
  };

  const clearStorage = async () => {
    if (confirm('Are you sure you want to clear ALL storage data? This cannot be undone.')) {
      try {
        await storageService.clearAllData();
        debug.warn(component, '🗑️ All storage data cleared');
        loadDebugData();
      } catch (error) {
        debug.error(component, '❌ Failed to clear storage', error as Error);
      }
    }
  };

  const exportDebugData = () => {
    const debugData = debug.exportDebugData();
    const blob = new Blob([debugData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    debug.info(component, '💾 Debug data exported');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <h2 className="text-xl font-bold text-white">🔧 Debug Panel</h2>
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
              {process.env.NODE_ENV || 'development'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              Auto-refresh
            </label>
            <button
              onClick={loadDebugData}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'logs', label: 'Console Logs', icon: '📝' },
            { id: 'state', label: 'System State', icon: '📊' },
            { id: 'tests', label: 'Tests', icon: '🧪' },
            { id: 'storage', label: 'Storage', icon: '💾' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Console Logs ({logs.length})</h3>
                  <div className="space-x-2">
                    <button
                      onClick={clearLogs}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Clear Logs
                    </button>
                    <button
                      onClick={exportDebugData}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Export Debug Data
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border-l-4 ${
                      log.level === 0 ? 'border-gray-500 bg-gray-800' :
                      log.level === 1 ? 'border-blue-500 bg-blue-900/20' :
                      log.level === 2 ? 'border-green-500 bg-green-900/20' :
                      log.level === 3 ? 'border-yellow-500 bg-yellow-900/20' :
                      log.level === 4 ? 'border-red-500 bg-red-900/20' :
                      'border-red-600 bg-red-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="bg-gray-700 px-1 rounded">{log.component}</span>
                        </div>
                        <div className="text-white">{log.message}</div>
                        {log.data && (
                          <details className="mt-2">
                            <summary className="text-gray-400 cursor-pointer">Show Data</summary>
                            <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No logs available. Start using the extension to see debug information.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'state' && (
            <div className="p-4 overflow-y-auto">
              <h3 className="font-semibold text-white mb-4">System State</h3>
              {systemState && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded p-4">
                    <h4 className="font-medium text-white mb-2">🚀 Performance</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Generated:</span>
                        <span className="text-white">{systemState.performance.generationCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average Time:</span>
                        <span className="text-white">{systemState.performance.averageTime.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Time:</span>
                        <span className="text-white">{systemState.performance.totalTime.toFixed(2)}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded p-4">
                    <h4 className="font-medium text-white mb-2">💾 Storage</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Used:</span>
                        <span className="text-white">{(systemState.storage.used / 1024).toFixed(2)} KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Quota:</span>
                        <span className="text-white">{(systemState.storage.quota / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Usage:</span>
                        <span className="text-white">{systemState.storage.percentage.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(systemState.storage.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {systemState.memory && (
                    <div className="bg-gray-800 rounded p-4">
                      <h4 className="font-medium text-white mb-2">🧠 Memory</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Used:</span>
                          <span className="text-white">{systemState.memory.used}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total:</span>
                          <span className="text-white">{systemState.memory.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Limit:</span>
                          <span className="text-white">{systemState.memory.limit}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-800 rounded p-4">
                    <h4 className="font-medium text-white mb-2">🔧 Extension</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Version:</span>
                        <span className="text-white">{systemState.extension.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Environment:</span>
                        <span className="text-white">{systemState.extension.environment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Chrome:</span>
                        <span className="text-white">{navigator.userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">🧪 Testing Suite</h3>
                <div className="space-x-2">
                  <button
                    onClick={generateTestData}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Generate Test Data
                  </button>
                  <button
                    onClick={runTests}
                    disabled={isRunningTests}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      result.status === 'passed' ? 'border-green-500 bg-green-900/20' :
                      result.status === 'failed' ? 'border-red-500 bg-red-900/20' :
                      'border-yellow-500 bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{result.name}</h4>
                      <span className={`text-sm px-2 py-1 rounded ${
                        result.status === 'passed' ? 'bg-green-600 text-white' :
                        result.status === 'failed' ? 'bg-red-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {result.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{result.details}</p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-gray-400 cursor-pointer text-sm">Show Test Data</summary>
                        <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {testResults.length === 0 && !isRunningTests && (
                  <div className="text-center text-gray-400 py-8">
                    Click "Run All Tests" to start the testing suite.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">💾 Storage Inspector</h3>
                <div className="space-x-2">
                  <button
                    onClick={() => storageService.exportData().then(data => {
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `qr-storage-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    })}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Export Storage
                  </button>
                  <button
                    onClick={clearStorage}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Clear All Storage
                  </button>
                </div>
              </div>

              {storageData && (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded p-4">
                    <h4 className="font-medium text-white mb-2">📜 QR History ({storageData.totalHistoryCount})</h4>
                    {storageData.qrHistory.length > 0 ? (
                      <div className="space-y-2">
                        {storageData.qrHistory.map((qr: any, index: number) => (
                          <div key={index} className="bg-gray-700 rounded p-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-white font-medium">{qr.title}</div>
                                <div className="text-gray-400">{qr.type} • {new Date(qr.timestamp).toLocaleString()}</div>
                              </div>
                              <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                                <img src={qr.dataUrl} alt="QR" className="w-full h-full object-cover rounded" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {storageData.totalHistoryCount > 5 && (
                          <div className="text-gray-400 text-sm text-center">
                            ... and {storageData.totalHistoryCount - 5} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No QR codes in history</div>
                    )}
                  </div>

                  <div className="bg-gray-800 rounded p-4">
                    <h4 className="font-medium text-white mb-2">⚙️ Settings</h4>
                    <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto text-gray-300">
                      {JSON.stringify(storageData.settings, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-gray-800 rounded p-4">
                    <h4 className="font-medium text-white mb-2">📊 Analytics</h4>
                    <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto text-gray-300">
                      {JSON.stringify(storageData.analytics, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;