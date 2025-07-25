/**
 * QR Super Generator - Batch QR Code Generator Component
 * 
 * Advanced component for generating QR codes from multiple browser tabs
 * with filtering, batch operations, and export capabilities
 */

import React, { useState, useEffect } from 'react';
import { Layers, QrCode, Download, Copy, Globe, CheckCircle, AlertTriangle, Filter, Archive } from 'lucide-react';
import { debug } from '../utils/debug';
import { qrService } from '../utils/qr-service';
import { storageService } from '../utils/storage-service';
import chromeAPIs, { TabInfo } from '../utils/chrome-apis';
import { QRCodeData } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface BatchGeneratorProps {
  onBatchGenerated?: (qrCodes: QRCodeData[]) => void;
  onError?: (error: string) => void;
}

interface TabWithQR extends TabInfo {
  qrData?: QRCodeData;
  selected: boolean;
  isGenerating: boolean;
  error?: string;
}

interface BatchStats {
  total: number;
  selected: number;
  generated: number;
  failed: number;
}

export default function BatchGenerator({ onBatchGenerated, onError }: BatchGeneratorProps) {
  const [tabs, setTabs] = useState<TabWithQR[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'http' | 'selected' | 'generated'>('http');
  const [batchStats, setBatchStats] = useState<BatchStats>({ total: 0, selected: 0, generated: 0, failed: 0 });

  const component = 'BatchGenerator';

  useEffect(() => {
    debug.info(component, '📑 Batch Generator initialized');
    loadTabs();
  }, []);

  useEffect(() => {
    updateBatchStats();
  }, [tabs]);

  const loadTabs = async () => {
    setIsLoadingTabs(true);
    
    try {
      debug.debug(component, '🔄 Loading browser tabs');
      
      const allTabs = await chromeAPIs.getAllTabs();
      const tabsWithQR: TabWithQR[] = allTabs.map(tab => ({
        ...tab,
        selected: tab.url ? (tab.url.startsWith('http://') || tab.url.startsWith('https://')) : false,
        isGenerating: false
      }));

      setTabs(tabsWithQR);
      debug.info(component, `✅ Loaded ${tabsWithQR.length} tabs`);
      
    } catch (error) {
      debug.error(component, '❌ Failed to load tabs', error as Error);
      if (onError) {
        onError('Failed to load browser tabs');
      }
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const updateBatchStats = () => {
    const stats: BatchStats = {
      total: tabs.length,
      selected: tabs.filter(tab => tab.selected).length,
      generated: tabs.filter(tab => tab.qrData).length,
      failed: tabs.filter(tab => tab.error).length
    };
    setBatchStats(stats);
  };

  const handleTabSelection = (tabId: number | undefined, selected: boolean) => {
    if (!tabId) return;
    
    debug.trackUserAction(component, 'toggle-tab-selection', 'tab-checkbox', { tabId, selected });
    
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, selected } : tab
    ));
  };

  const handleSelectAll = (selectAll: boolean) => {
    debug.trackUserAction(component, 'select-all-tabs', 'select-all-button', { selectAll });
    
    setTabs(prev => prev.map(tab => ({
      ...tab,
      selected: selectAll && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
    })));
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    debug.trackUserAction(component, 'change-filter', 'filter-select', { filter: newFilter });
    setFilter(newFilter);
  };

  const generateQRForTab = async (tab: TabWithQR): Promise<QRCodeData | null> => {
    if (!tab.url || !tab.id) return null;

    try {
      debug.debug(component, `🎯 Generating QR for tab: ${tab.title}`);
      
      const qrData = await qrService.generateQRCode(tab.url, {
        width: 256,
        color: {
          dark: '#9333ea',
          light: '#ffffff'
        }
      }, 'url');

      // Add metadata about the source tab
      qrData.metadata = {
        ...qrData.metadata,
        sourceTab: {
          id: tab.id,
          title: tab.title,
          favIconUrl: tab.favIconUrl
        }
      };

      await storageService.addToHistory(qrData);
      
      debug.info(component, `✅ QR generated for tab: ${tab.title}`);
      return qrData;
      
    } catch (error) {
      debug.error(component, `❌ Failed to generate QR for tab: ${tab.title}`, error as Error);
      throw error;
    }
  };

  const handleGenerateBatch = async () => {
    const selectedTabs = tabs.filter(tab => tab.selected);
    
    if (selectedTabs.length === 0) {
      if (onError) {
        onError('Please select at least one tab to generate QR codes');
      }
      return;
    }

    debug.trackUserAction(component, 'generate-batch', 'generate-button', { count: selectedTabs.length });
    setIsGenerating(true);

    try {
      debug.startPerformance('batch-qr-generation', component);
      debug.info(component, `📑 Starting batch generation for ${selectedTabs.length} tabs`);

      const generatedQRs: QRCodeData[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process tabs one by one to avoid overwhelming the system
      for (const tab of selectedTabs) {
        try {
          // Update tab status to generating
          setTabs(prev => prev.map(t => 
            t.id === tab.id ? { ...t, isGenerating: true, error: undefined } : t
          ));

          const qrData = await generateQRForTab(tab);
          
          if (qrData) {
            generatedQRs.push(qrData);
            successCount++;
            
            // Update tab with generated QR
            setTabs(prev => prev.map(t => 
              t.id === tab.id ? { ...t, qrData, isGenerating: false } : t
            ));
          }
          
        } catch (error) {
          failCount++;
          const errorMessage = (error as Error).message;
          
          // Update tab with error
          setTabs(prev => prev.map(t => 
            t.id === tab.id ? { ...t, error: errorMessage, isGenerating: false } : t
          ));
          
          debug.error(component, `❌ Failed to generate QR for tab: ${tab.title}`, error as Error);
        }

        // Small delay to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      debug.endPerformance('batch-qr-generation', component);

      if (onBatchGenerated && generatedQRs.length > 0) {
        onBatchGenerated(generatedQRs);
      }

      debug.info(component, `✅ Batch generation completed`, {
        total: selectedTabs.length,
        success: successCount,
        failed: failCount
      });

    } catch (error) {
      debug.endPerformance('batch-qr-generation', component);
      debug.error(component, '❌ Batch generation failed', error as Error);
      
      if (onError) {
        onError('Batch generation failed');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportBatch = async () => {
    const generatedTabs = tabs.filter(tab => tab.qrData);
    
    if (generatedTabs.length === 0) {
      if (onError) {
        onError('No QR codes to export');
      }
      return;
    }

    debug.trackUserAction(component, 'export-batch', 'export-button', { count: generatedTabs.length });

    try {
      debug.info(component, `📦 Exporting ${generatedTabs.length} QR codes as ZIP`);
      
      const zip = new JSZip();
      
      for (const tab of generatedTabs) {
        if (tab.qrData) {
          // Convert data URL to blob
          const response = await fetch(tab.qrData.dataUrl);
          const blob = await response.blob();
          
          // Create filename from tab title
          const filename = `${tab.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'untitled'}-qr.png`;
          zip.file(filename, blob);
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `qr-batch-${new Date().toISOString().split('T')[0]}-${generatedTabs.length}-codes.zip`;
      
      saveAs(zipBlob, zipFilename);
      
      debug.info(component, '✅ Batch export completed', { filename: zipFilename });
      
    } catch (error) {
      debug.error(component, '❌ Batch export failed', error as Error);
      if (onError) {
        onError('Failed to export QR codes');
      }
    }
  };

  const getFilteredTabs = () => {
    switch (filter) {
      case 'http':
        return tabs.filter(tab => tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://')));
      case 'selected':
        return tabs.filter(tab => tab.selected);
      case 'generated':
        return tabs.filter(tab => tab.qrData);
      default:
        return tabs;
    }
  };

  const clearBatch = () => {
    debug.trackUserAction(component, 'clear-batch', 'clear-button');
    setTabs(prev => prev.map(tab => ({
      ...tab,
      qrData: undefined,
      error: undefined,
      selected: false
    })));
  };

  const filteredTabs = getFilteredTabs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Batch QR Generator</h2>
            <p className="text-gray-300 text-sm">Generate QR codes for multiple browser tabs</p>
          </div>
        </div>
        
        <button
          onClick={loadTabs}
          disabled={isLoadingTabs}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 px-4 rounded-lg transition-colors text-white text-sm"
        >
          {isLoadingTabs ? 'Loading...' : 'Refresh Tabs'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Tabs', value: batchStats.total, color: 'bg-gray-600' },
          { label: 'Selected', value: batchStats.selected, color: 'bg-blue-600' },
          { label: 'Generated', value: batchStats.generated, color: 'bg-green-600' },
          { label: 'Failed', value: batchStats.failed, color: 'bg-red-600' }
        ].map((stat) => (
          <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 text-center">
            <div className={`text-2xl font-bold text-white mb-1`}>{stat.value}</div>
            <div className="text-xs text-gray-300">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value as typeof filter)}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm"
              >
                <option value="all">All Tabs</option>
                <option value="http">HTTP/HTTPS Only</option>
                <option value="selected">Selected</option>
                <option value="generated">Generated</option>
              </select>
            </div>

            {/* Select All */}
            <button
              onClick={() => handleSelectAll(batchStats.selected < batchStats.total)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {batchStats.selected < batchStats.total ? 'Select All' : 'Deselect All'}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateBatch}
              disabled={isGenerating || batchStats.selected === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 px-4 rounded-lg transition-colors text-white text-sm flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Generate QRs</span>
                </>
              )}
            </button>

            {batchStats.generated > 0 && (
              <button
                onClick={handleExportBatch}
                className="bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg transition-colors text-white text-sm flex items-center space-x-2"
              >
                <Archive className="w-4 h-4" />
                <span>Export ZIP</span>
              </button>
            )}

            <button
              onClick={clearBatch}
              className="border border-white/20 hover:bg-white/10 py-2 px-4 rounded-lg transition-colors text-white text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Tabs List */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 max-h-96 overflow-y-auto">
        {isLoadingTabs ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-300">Loading browser tabs...</p>
          </div>
        ) : filteredTabs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tabs found matching the current filter</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredTabs.map((tab) => (
              <div key={tab.id} className="p-4 flex items-center space-x-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={tab.selected}
                  onChange={(e) => handleTabSelection(tab.id, e.target.checked)}
                  disabled={!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                />

                {/* Tab Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {tab.favIconUrl && (
                      <img src={tab.favIconUrl} alt="" className="w-4 h-4" />
                    )}
                    <p className="font-medium text-white truncate">{tab.title || 'Untitled'}</p>
                  </div>
                  <p className="text-sm text-gray-300 truncate">{tab.url}</p>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {tab.isGenerating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  )}
                  
                  {tab.qrData && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <img src={tab.qrData.dataUrl} alt="QR" className="w-8 h-8 rounded" />
                    </div>
                  )}
                  
                  {tab.error && (
                    <AlertTriangle className="w-4 h-4 text-red-400" title={tab.error} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 