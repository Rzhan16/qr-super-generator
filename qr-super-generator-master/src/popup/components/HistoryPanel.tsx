import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Copy, Download, ExternalLink, Trash2, Archive, Star, Clock, Globe, Wifi, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { QRCodeData } from '../../types';

// QR Code Image component with error handling
const QRCodeImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-700/50`}>
        <AlertCircle className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700/50">
          <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

interface HistoryPanelProps {
  recentQRCodes: QRCodeData[];
  onClearHistory: () => void;
}

type FilterType = 'all' | 'url' | 'wifi' | 'text' | 'custom';
type SortType = 'newest' | 'oldest' | 'type' | 'title';

const HistoryPanel: React.FC<HistoryPanelProps> = ({ recentQRCodes, onClearHistory }) => {
  const [allQRCodes, setAllQRCodes] = useState<QRCodeData[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<QRCodeData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    // Load all QR codes from history
    const loadHistory = async () => {
      try {
        const result = await chrome.storage.local.get(['qrHistory']);
        if (result.qrHistory && Array.isArray(result.qrHistory)) {
          // Validate QR codes and filter out corrupted ones
          const validQRCodes = result.qrHistory.filter(qr => 
            qr && 
            qr.dataUrl && 
            qr.text && 
            qr.timestamp &&
            qr.dataUrl.startsWith('data:image/')
          );
          setAllQRCodes(validQRCodes);
        }
      } catch (error) {
        console.error('Failed to load QR history:', error);
        setAllQRCodes([]);
      }
    };
    
    loadHistory();
  }, [recentQRCodes]);

  useEffect(() => {
    let filtered = [...allQRCodes];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(qr => 
        qr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qr.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(qr => qr.type === filter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredCodes(filtered);
  }, [allQRCodes, searchTerm, filter, sortBy]);

  const handleCopy = async (qr: QRCodeData) => {
    try {
      const response = await fetch(qr.dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = (qr: QRCodeData) => {
    const link = document.createElement('a');
    link.href = qr.dataUrl;
    link.download = `${qr.title.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.click();
  };

  const handleDelete = (qr: QRCodeData) => {
    const updatedHistory = allQRCodes.filter(item => item.id !== qr.id);
    chrome.storage.local.set({ qrHistory: updatedHistory });
    setAllQRCodes(updatedHistory);
  };

  const handleBulkAction = (action: 'download' | 'delete') => {
    if (action === 'download') {
      selectedItems.forEach(id => {
        const qr = allQRCodes.find(q => q.id.toString() === id);
        if (qr) handleDownload(qr);
      });
    } else if (action === 'delete') {
      const updatedHistory = allQRCodes.filter(item => !selectedItems.has(item.id.toString()));
      chrome.storage.local.set({ qrHistory: updatedHistory });
      setAllQRCodes(updatedHistory);
    }
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  const toggleSelection = (id: number) => {
    const idStr = id.toString();
    const newSelection = new Set(selectedItems);
    if (newSelection.has(idStr)) {
      newSelection.delete(idStr);
    } else {
      newSelection.add(idStr);
    }
    setSelectedItems(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return Globe;
      case 'wifi': return Wifi;
      case 'text': return FileText;
      default: return Star;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'url': return 'text-blue-400';
      case 'wifi': return 'text-green-400';
      case 'text': return 'text-gray-400';
      default: return 'text-purple-400';
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Types', icon: Archive },
    { value: 'url', label: 'URLs', icon: Globe },
    { value: 'wifi', label: 'WiFi', icon: Wifi },
    { value: 'text', label: 'Text', icon: FileText },
    { value: 'custom', label: 'Custom', icon: Star }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'type', label: 'By Type' },
    { value: 'title', label: 'By Title' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card text-center">
        <div className="flex items-center justify-center mb-3">
          <History className="w-6 h-6 text-accent-400 mr-2" />
          <h2 className="text-xl font-bold text-white">QR Code History</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Browse and manage your generated QR codes
        </p>
      </div>

      {/* Search and Filters */}
      <div className="glass-card space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search QR codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input pl-10 w-full"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filter:</span>
          </div>
          {filterOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as FilterType)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                  filter === option.value
                    ? 'bg-primary-500 text-white'
                    : 'glass-button text-gray-300 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="glass-input text-xs"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-dark-800">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="glass-card bg-primary-500/10 border border-primary-500/20">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('download')}
                className="glass-button px-3 py-1 text-xs hover:bg-green-500/20"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="glass-button px-3 py-1 text-xs hover:bg-red-500/20"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedItems(new Set());
                  setShowBulkActions(false);
                }}
                className="text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code List */}
      <div className="space-y-3">
        {filteredCodes.length === 0 ? (
          <div className="glass-card text-center py-12">
            <div className="w-16 h-16 bg-gradient-purple-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || filter !== 'all' ? 'No results found' : 'No QR codes yet'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start generating QR codes to see them here'
              }
            </p>
            {(!searchTerm && filter === 'all') && (
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <Sparkles className="w-3 h-3" />
                <span>Premium history tracking active</span>
              </div>
            )}
          </div>
        ) : (
          filteredCodes.map((qr) => {
            const TypeIcon = getTypeIcon(qr.type || '');
            const isSelected = selectedItems.has(qr.id.toString());
            
            return (
              <div
                key={qr.id}
                className={`glass-card hover:bg-white/5 transition-all duration-300 ${
                  isSelected ? 'bg-primary-500/10 border-primary-500/30' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Selection checkbox */}
                  <label className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(qr.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-colors ${
                      isSelected 
                        ? 'bg-primary-500 border-primary-500' 
                        : 'border-gray-500 hover:border-gray-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </label>

                  {/* QR Code Image */}
                  <div className="flex-shrink-0">
                    <QRCodeImage 
                      src={qr.dataUrl} 
                      alt={`QR Code for ${qr.title}`}
                      className="w-16 h-16 rounded-lg border border-white/20 bg-white/5"
                    />
                  </div>

                  {/* QR Code Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{qr.title}</h4>
                      <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full bg-gray-700/50 ${getTypeColor(qr.type || '')}`}>
                        <TypeIcon className="w-3 h-3" />
                        <span className="text-xs capitalize">{qr.type || 'unknown'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 break-all line-clamp-2">{qr.text}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(qr.timestamp).toLocaleDateString()}</span>
                        <span>{new Date(qr.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleCopy(qr)}
                      className="glass-button p-2 hover:bg-blue-500/20 group"
                      title="Copy QR Code"
                    >
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDownload(qr)}
                      className="glass-button p-2 hover:bg-green-500/20 group"
                      title="Download QR Code"
                    >
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                    </button>
                    {qr.type === 'url' && (
                      <button
                        onClick={() => chrome.tabs.create({ url: qr.text })}
                        className="glass-button p-2 hover:bg-purple-500/20 group"
                        title="Open URL"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(qr)}
                      className="glass-button p-2 hover:bg-red-500/20 group"
                      title="Delete QR Code"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Button */}
      {allQRCodes.length > 0 && (
        <div className="glass-card">
          <button
            onClick={onClearHistory}
            className="w-full glass-button py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All History ({allQRCodes.length} items)
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;