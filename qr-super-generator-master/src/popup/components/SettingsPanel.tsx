import React, { useState, useEffect } from 'react';
import { Settings, Palette, Download, Shield, Bell, Zap, Moon, Sun, Monitor, Save, RotateCcw, Crown, Sparkles } from 'lucide-react';

interface SettingsData {
  theme: 'light' | 'dark' | 'auto';
  defaultSize: number;
  defaultErrorCorrection: 'L' | 'M' | 'Q' | 'H';
  autoDownload: boolean;
  notifications: boolean;
  quickMode: boolean;
  defaultColors: {
    dark: string;
    light: string;
  };
  shortcuts: {
    quickGenerate: string;
    openPopup: string;
  };
  privacy: {
    storeHistory: boolean;
    analytics: boolean;
  };
}

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    theme: 'dark',
    defaultSize: 256,
    defaultErrorCorrection: 'M',
    autoDownload: false,
    notifications: true,
    quickMode: true,
    defaultColors: {
      dark: '#9333ea',
      light: '#ffffff'
    },
    shortcuts: {
      quickGenerate: 'Ctrl+Shift+Q',
      openPopup: 'Ctrl+Shift+E'
    },
    privacy: {
      storeHistory: true,
      analytics: true
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from storage
    async function loadSettings() {
      try {
        const result = await chrome.storage.sync.get(['extensionSettings']);
        if (result.extensionSettings) {
          setSettings(prev => ({ ...prev, ...result.extensionSettings }));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise<void>(resolve => {
        chrome.storage.sync.set({ extensionSettings: settings }, () => resolve());
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: SettingsData = {
      theme: 'dark',
      defaultSize: 256,
      defaultErrorCorrection: 'M',
      autoDownload: false,
      notifications: true,
      quickMode: true,
      defaultColors: {
        dark: '#9333ea',
        light: '#ffffff'
      },
      shortcuts: {
        quickGenerate: 'Ctrl+Shift+Q',
        openPopup: 'Ctrl+Shift+E'
      },
      privacy: {
        storeHistory: true,
        analytics: true
      }
    };
    setSettings(defaultSettings);
  };

  const settingSections = [
    {
      title: 'Appearance',
      icon: Palette,
      settings: [
        {
          key: 'theme',
          label: 'Theme',
          type: 'select' as const,
          options: [
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'auto', label: 'Auto', icon: Monitor }
          ]
        },
        {
          key: 'defaultColors.dark',
          label: 'Default Dark Color',
          type: 'color' as const
        },
        {
          key: 'defaultColors.light',
          label: 'Default Light Color',
          type: 'color' as const
        }
      ]
    },
    {
      title: 'QR Generation',
      icon: Zap,
      settings: [
        {
          key: 'defaultSize',
          label: 'Default Size',
          type: 'range' as const,
          min: 128,
          max: 512,
          step: 32,
          unit: 'px'
        },
        {
          key: 'defaultErrorCorrection',
          label: 'Error Correction',
          type: 'select' as const,
          options: [
            { value: 'L', label: 'Low (~7%)', description: 'Faster generation' },
            { value: 'M', label: 'Medium (~15%)', description: 'Recommended' },
            { value: 'Q', label: 'Quartile (~25%)', description: 'Better recovery' },
            { value: 'H', label: 'High (~30%)', description: 'Maximum recovery' }
          ]
        },
        {
          key: 'quickMode',
          label: 'Quick Mode',
          type: 'toggle' as const,
          description: 'Generate QR codes instantly on page load'
        }
      ]
    },
    {
      title: 'Downloads',
      icon: Download,
      settings: [
        {
          key: 'autoDownload',
          label: 'Auto Download',
          type: 'toggle' as const,
          description: 'Automatically download generated QR codes'
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          key: 'notifications',
          label: 'Show Notifications',
          type: 'toggle' as const,
          description: 'Display success and error notifications'
        }
      ]
    },
    {
      title: 'Privacy',
      icon: Shield,
      settings: [
        {
          key: 'privacy.storeHistory',
          label: 'Store History',
          type: 'toggle' as const,
          description: 'Keep a history of generated QR codes'
        },
        {
          key: 'privacy.analytics',
          label: 'Anonymous Analytics',
          type: 'toggle' as const,
          description: 'Help improve the extension with usage data'
        }
      ]
    }
  ];

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, p) => o && o[p], obj);
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((o, k) => o[k], obj);
    target[lastKey] = value;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card text-center">
        <div className="flex items-center justify-center mb-3">
          <Crown className="w-6 h-6 text-yellow-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Premium Settings</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Customize your QR generation experience
        </p>
      </div>

      {/* Settings Sections */}
      {settingSections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="glass-card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-purple-blue rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            </div>

            <div className="space-y-4">
              {section.settings.map((setting) => {
                const value = getNestedValue(settings, setting.key);

                return (
                  <div key={setting.key} className="glass-dark rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-white font-medium text-sm block mb-1">
                          {setting.label}
                        </label>
                        {'description' in setting && setting.description && (
                          <p className="text-gray-400 text-xs mb-3">{setting.description}</p>
                        )}
                      </div>

                      <div className="ml-4">
                        {setting.type === 'toggle' && (
                          <button
                            onClick={() => {
                              const newSettings = { ...settings };
                              setNestedValue(newSettings, setting.key, !value);
                              setSettings(newSettings);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              value ? 'bg-primary-500' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        )}

                        {setting.type === 'select' && (
                          <select
                            value={value}
                            onChange={(e) => {
                              const newSettings = { ...settings };
                              setNestedValue(newSettings, setting.key, e.target.value);
                              setSettings(newSettings);
                            }}
                            className="glass-input text-sm"
                          >
                            {setting.options?.map((option) => (
                              <option key={option.value} value={option.value} className="bg-dark-800">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {setting.type === 'color' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={value}
                              onChange={(e) => {
                                const newSettings = { ...settings };
                                setNestedValue(newSettings, setting.key, e.target.value);
                                setSettings(newSettings);
                              }}
                              className="w-10 h-8 rounded border-0 glass cursor-pointer"
                            />
                            <span className="text-gray-400 text-xs font-mono">{value}</span>
                          </div>
                        )}

                        {setting.type === 'range' && (
                          <div className="space-y-2">
                            <input
                              type="range"
                              min={setting.min}
                              max={setting.max}
                              step={setting.step}
                              value={value}
                              onChange={(e) => {
                                const newSettings = { ...settings };
                                setNestedValue(newSettings, setting.key, parseInt(e.target.value));
                                setSettings(newSettings);
                              }}
                              className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-gray-400 text-xs">
                              {value}{setting.unit}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {setting.type === 'select' && setting.options && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {setting.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newSettings = { ...settings };
                              setNestedValue(newSettings, setting.key, option.value);
                              setSettings(newSettings);
                            }}
                            className={`text-left p-2 rounded-lg transition-colors ${
                              value === option.value
                                ? 'bg-primary-500/20 border border-primary-500'
                                : 'bg-gray-700/50 hover:bg-gray-600/50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              {'icon' in option && option.icon && React.createElement(option.icon, { className: "w-4 h-4 text-gray-400" })}
                              <span className="text-white text-sm">{option.label}</span>
                            </div>
                            {'description' in option && option.description && (
                              <p className="text-gray-400 text-xs mt-1">{option.description}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Action Buttons */}
      <div className="glass-card">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 glass-button py-3 px-4 bg-gradient-purple-blue text-white font-medium rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
              saved ? 'bg-green-500' : ''
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <span className="text-green-500 text-xs">✓</span>
                </div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}</span>
            </div>
          </button>

          <button
            onClick={handleReset}
            className="glass-button py-3 px-4 text-gray-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pro Features */}
      <div className="glass-card bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Premium Features Active</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Unlimited QR code generation</li>
              <li>• Custom color schemes</li>
              <li>• Batch processing</li>
              <li>• Advanced analytics</li>
              <li>• Priority support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;