import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Download, RefreshCw, Check, X, Eye, EyeOff, Archive } from 'lucide-react';
import { generateBatchQRCodes, QROptions } from '../../utils/qr-generator';
import { getAllTabs } from '../../utils/chrome-apis';
import { addToQRHistory, trackQRGeneration } from '../../utils/storage';
import { QRCodeData, ExtensionTab } from '../../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface BatchGeneratorProps {
  onBatchComplete?: (results: QRCodeData[]) => void;
  className?: string;
}

interface TabSelection {
  tab: ExtensionTab;
  selected: boolean;
  error?: string;
  qrData?: QRCodeData;
}

interface BatchProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  isRunning: boolean;
}

const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  onBatchComplete,
  className = ''
}) => {
  // State management
  const [tabs, setTabs] = useState<TabSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    isRunning: false
  });
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<QRCodeData[]>([]);
  
  // QR Options
  const [qrOptions] = useState<QROptions>({
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png'
  });

  // Load browser tabs
  const loadTabs = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const allTabs = await getAllTabs();
      
      // Filter out invalid URLs and chrome:// pages
      const validTabs = allTabs.filter(tab => 
        tab.url && 
        tab.url.startsWith('http') &&
        !tab.url.includes('chrome://') &&
        !tab.url.includes('chrome-extension://')
      );

      const tabSelections: TabSelection[] = validTabs.map(tab => ({
        tab,
        selected: true // Select all by default
      }));

      setTabs(tabSelections);
      
      if (validTabs.length === 0) {
        setError('No valid tabs found. Open some websites first.');
      }
    } catch (err) {
      console.error('Failed to load tabs:', err);
      setError('Failed to load browser tabs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tabs on component mount
  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // Toggle tab selection
  const toggleTab = (index: number) => {
    setTabs(prev => prev.map((tab, i) => 
      i === index ? { ...tab, selected: !tab.selected } : tab
    ));
  };

  // Select/deselect all tabs
  const toggleAll = () => {
    const hasUnselected = tabs.some(tab => !tab.selected);
    setTabs(prev => prev.map(tab => ({ ...tab, selected: hasUnselected })));
  };

  // Get selected tabs
  const selectedTabs = tabs.filter(tab => tab.selected);
  const selectedCount = selectedTabs.length;

  // Generate QR codes for selected tabs
  const generateBatch = useCallback(async () => {
    if (selectedCount === 0) {
      setError('Please select at least one tab');
      return;
    }

    setProgress({
      total: selectedCount,
      completed: 0,
      successful: 0,
      failed: 0,
      isRunning: true
    });
    setError('');
    setResults([]);

    const urls = selectedTabs.map(({ tab }) => tab.url || '');
    const batchResults: QRCodeData[] = [];

    try {
      // Generate QR codes in chunks to avoid overwhelming the browser
      const chunkSize = 5;
      for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        const chunkTabs = selectedTabs.slice(i, i + chunkSize);
        
        const chunkResults = await generateBatchQRCodes(chunk, qrOptions);
        
        // Process results and update progress
        for (let j = 0; j < chunkResults.length; j++) {
          const result = chunkResults[j];
          const tabInfo = chunkTabs[j];
          
          setProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
            successful: result.error ? prev.successful : prev.successful + 1,
            failed: result.error ? prev.failed + 1 : prev.failed
          }));

          if (!result.error) {
            // Create QR data object
            const qrData: QRCodeData = {
              id: Date.now() + j,
              text: result.text,
              dataUrl: result.dataUrl,
              timestamp: new Date().toISOString(),
              title: tabInfo.tab.title || 'Browser Tab',
              type: 'url',
              metadata: {
                size: qrOptions.width || 256,
                errorLevel: qrOptions.errorCorrectionLevel || 'M',
                color: {
                  dark: qrOptions.color?.dark || '#000000',
                  light: qrOptions.color?.light || '#FFFFFF'
                }
              }
            };

            batchResults.push(qrData);
            
            // Save to history
            await addToQRHistory(qrData);
            await trackQRGeneration('batch', qrOptions.width || 256);
          }

          // Update tab status
          setTabs(prev => prev.map((tab, index) => {
            const globalIndex = Math.floor(i / chunkSize) * chunkSize + j;
            if (index === globalIndex) {
              return {
                ...tab,
                error: result.error,
                qrData: result.error ? undefined : batchResults[batchResults.length - 1]
              };
            }
            return tab;
          }));
        }

        // Small delay between chunks to prevent UI blocking
        if (i + chunkSize < urls.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setResults(batchResults);
      onBatchComplete?.(batchResults);
      
    } catch (err) {
      console.error('Batch generation failed:', err);
      setError('Batch generation failed. Please try again.');
    } finally {
      setProgress(prev => ({ ...prev, isRunning: false }));
    }
  }, [selectedTabs, selectedCount, qrOptions, onBatchComplete]);

  // Download all QR codes as ZIP
  const downloadAsZip = useCallback(async () => {
    if (results.length === 0) return;

    try {
      const zip = new JSZip();
      
      for (const qrData of results) {
        // Convert data URL to blob
        const response = await fetch(qrData.dataUrl);
        const blob = await response.blob();
        
        // Create safe filename
        const safeTitle = qrData.title
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase()
          .substring(0, 50);
        
        const filename = `${safeTitle}_${qrData.id}.png`;
        zip.file(filename, blob);
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `qr_codes_batch_${timestamp}.zip`);
      
    } catch (err) {
      console.error('ZIP download failed:', err);
      setError('Failed to download ZIP file');
    }
  }, [results]);

  // Download individual QR code
  const downloadIndividual = async (qrData: QRCodeData) => {
    try {
      const link = document.createElement('a');
      link.href = qrData.dataUrl;
      link.download = `${qrData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className={`bg-white rounded-lg border p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Batch Generator</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          
          <button
            onClick={loadTabs}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Refresh tabs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress.isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Generating QR codes... ({progress.completed}/{progress.total})
            </span>
            <span className="text-gray-600">
              {Math.round((progress.completed / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>✅ Success: {progress.successful}</span>
            <span>❌ Failed: {progress.failed}</span>
          </div>
        </div>
      )}

      {/* Batch Summary */}
      {results.length > 0 && !progress.isRunning && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Batch Complete! {results.length} QR codes generated
              </p>
              <p className="text-xs text-green-600">
                Success: {progress.successful} • Failed: {progress.failed}
              </p>
            </div>
            <button
              onClick={downloadAsZip}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Archive className="w-4 h-4" />
              <span>ZIP</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Tab Selection Controls */}
      {tabs.length > 0 && (
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleAll}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {selectedCount === tabs.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-600">
              {selectedCount} of {tabs.length} tabs selected
            </span>
          </div>
        </div>
      )}

      {/* Tabs List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tabs.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tabs.map((tabSelection, index) => {
            const { tab, selected, error: tabError, qrData } = tabSelection;
            
            return (
              <div
                key={tab.id || index}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selected ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
                } ${tabError ? 'border-red-200 bg-red-50' : ''}`}
                onClick={() => toggleTab(index)}
              >
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTab(index)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tab.title || 'Untitled'}
                    </p>
                    
                    {qrData && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                    
                    {tabError && (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 truncate">
                    {tab.url}
                  </p>
                  
                  {tabError && (
                    <p className="text-xs text-red-600 mt-1">
                      {tabError}
                    </p>
                  )}
                </div>
                
                {qrData && showPreview && (
                  <div className="flex-shrink-0 flex items-center space-x-2">
                    <img
                      src={qrData.dataUrl}
                      alt="QR Preview"
                      className="w-8 h-8 border rounded"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadIndividual(qrData);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No tabs available</p>
          <button
            onClick={loadTabs}
            className="mt-2 text-sm text-purple-600 hover:text-purple-700"
          >
            Refresh tabs
          </button>
        </div>
      )}

      {/* Generate Button */}
      {tabs.length > 0 && (
        <button
          onClick={generateBatch}
          disabled={selectedCount === 0 || progress.isRunning}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {progress.isRunning 
            ? 'Generating...' 
            : `Generate QR Codes for ${selectedCount} Tab${selectedCount !== 1 ? 's' : ''}`
          }
        </button>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-1">Batch Generator</h4>
        <p className="text-sm text-blue-800">
          Generate QR codes for multiple browser tabs at once. 
          Select the tabs you want to include and click generate.
          All QR codes can be downloaded as a ZIP file.
        </p>
      </div>
    </div>
  );
};

export default BatchGenerator;