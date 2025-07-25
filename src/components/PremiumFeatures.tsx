/**
 * QR Super Generator - Premium Features Component
 * 
 * Monetization-ready component with feature gating, upgrade prompts,
 * viral growth mechanisms, and premium feature showcasing
 */

import React, { useState, useEffect } from 'react';
import { Crown, Star, Zap, Users, Gift, Lock, Check, X, ExternalLink, Share2, Heart } from 'lucide-react';
import analytics from '../utils/analytics';

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  isPremium: boolean;
  isNew?: boolean;
  category: 'generation' | 'export' | 'customization' | 'analytics' | 'sharing';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: 'month' | 'year';
  features: string[];
  popular?: boolean;
  discount?: number;
}

interface PremiumState {
  isPremium: boolean;
  plan?: SubscriptionPlan;
  trialDaysLeft?: number;
  showUpgradeModal: boolean;
  selectedPlan?: string;
  referralCode?: string;
  totalReferrals: number;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'batch_unlimited',
    name: 'Unlimited Batch Generation',
    description: 'Generate up to 10,000 QR codes at once',
    icon: Zap,
    isPremium: true,
    category: 'generation'
  },
  {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'Add your logo and remove watermarks',
    icon: Crown,
    isPremium: true,
    category: 'customization'
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed usage insights and trends',
    icon: Star,
    isPremium: true,
    category: 'analytics'
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: '24/7 premium customer support',
    icon: Heart,
    isPremium: true,
    category: 'sharing'
  },
  {
    id: 'export_formats',
    name: 'All Export Formats',
    description: 'PDF, SVG, EPS, and more formats',
    icon: ExternalLink,
    isPremium: true,
    category: 'export'
  },
  {
    id: 'team_sharing',
    name: 'Team Collaboration',
    description: 'Share and collaborate with your team',
    icon: Users,
    isPremium: true,
    isNew: true,
    category: 'sharing'
  }
];

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    currency: 'USD',
    period: 'month',
    features: [
      'Up to 100 QR codes/month',
      'Basic export formats',
      'Standard support',
      'Basic customization'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    currency: 'USD',
    period: 'month',
    features: [
      'Unlimited QR codes',
      'All export formats',
      'Custom branding',
      'Advanced analytics',
      'Priority support'
    ],
    popular: true
  },
  {
    id: 'team',
    name: 'Team',
    price: 29.99,
    currency: 'USD',
    period: 'month',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Admin dashboard',
      'Bulk user management',
      'API access'
    ]
  },
  {
    id: 'pro_yearly',
    name: 'Pro (Yearly)',
    price: 99.99,
    currency: 'USD',
    period: 'year',
    features: [
      'Everything in Pro',
      '2 months free',
      'Early access to features'
    ],
    discount: 17
  }
];

interface PremiumFeaturesProps {
  onFeatureClick?: (feature: PremiumFeature) => void;
  showUpgrade?: boolean;
}

export default function PremiumFeatures({ onFeatureClick, showUpgrade = false }: PremiumFeaturesProps) {
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    showUpgradeModal: showUpgrade,
    totalReferrals: 0
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadPremiumStatus();
    loadReferralData();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const result = await chrome.storage.local.get(['premiumStatus', 'subscriptionPlan', 'trialDaysLeft']);
      
      setState(prev => ({
        ...prev,
        isPremium: result.premiumStatus || false,
        plan: result.subscriptionPlan,
        trialDaysLeft: result.trialDaysLeft
      }));
    } catch (error) {
      console.error('Failed to load premium status:', error);
    }
  };

  const loadReferralData = async () => {
    try {
      const result = await chrome.storage.local.get(['referralCode', 'totalReferrals']);
      
      setState(prev => ({
        ...prev,
        referralCode: result.referralCode || generateReferralCode(),
        totalReferrals: result.totalReferrals || 0
      }));

      // Generate and save referral code if not exists
      if (!result.referralCode) {
        const code = generateReferralCode();
        await chrome.storage.local.set({ referralCode: code });
        setState(prev => ({ ...prev, referralCode: code }));
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    }
  };

  const generateReferralCode = (): string => {
    return `QR${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleFeatureClick = (feature: PremiumFeature) => {
    analytics.trackEvent('premium', 'feature_clicked', {
      featureId: feature.id,
      isPremium: feature.isPremium,
      userPremium: state.isPremium
    });

    if (feature.isPremium && !state.isPremium) {
      setState(prev => ({ ...prev, showUpgradeModal: true }));
    } else {
      onFeatureClick?.(feature);
    }
  };

  const handleUpgrade = (planId: string) => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    
    analytics.trackEvent('premium', 'upgrade_clicked', {
      planId,
      price: plan?.price,
      period: plan?.period
    });

    // Redirect to payment processor
    const upgradeUrl = `https://payments.example.com/upgrade?plan=${planId}&user=${state.referralCode}`;
    chrome.tabs.create({ url: upgradeUrl });
  };

  const handleShare = async (method: 'twitter' | 'facebook' | 'email' | 'copy') => {
    const shareText = `🚀 Just discovered QR Super Generator - the best QR code extension for Chrome! Get premium features with my referral code: ${state.referralCode}`;
    const shareUrl = `https://chrome.google.com/webstore/detail/qr-super-generator?ref=${state.referralCode}`;

    analytics.trackShare(method, 'referral_link', true);

    switch (method) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=Check out QR Super Generator&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`);
        break;
      case 'copy':
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        // Show success toast
        break;
    }

    // Track referral attempt
    await chrome.storage.local.set({
      lastShareAttempt: Date.now(),
      shareMethod: method
    });
  };

  const filteredFeatures = selectedCategory === 'all' 
    ? PREMIUM_FEATURES 
    : PREMIUM_FEATURES.filter(f => f.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'All Features', count: PREMIUM_FEATURES.length },
    { id: 'generation', name: 'Generation', count: PREMIUM_FEATURES.filter(f => f.category === 'generation').length },
    { id: 'export', name: 'Export', count: PREMIUM_FEATURES.filter(f => f.category === 'export').length },
    { id: 'customization', name: 'Customization', count: PREMIUM_FEATURES.filter(f => f.category === 'customization').length },
    { id: 'analytics', name: 'Analytics', count: PREMIUM_FEATURES.filter(f => f.category === 'analytics').length },
    { id: 'sharing', name: 'Sharing', count: PREMIUM_FEATURES.filter(f => f.category === 'sharing').length }
  ];

  return (
    <div className="space-y-6">
      {/* Premium Status */}
      <div className={`bg-gradient-to-r ${state.isPremium ? 'from-yellow-500 to-orange-500' : 'from-blue-500 to-purple-500'} rounded-lg p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="w-6 h-6" />
            <div>
              <h3 className="font-bold">
                {state.isPremium ? 'Premium Active' : 'Free Plan'}
              </h3>
              <p className="text-sm opacity-90">
                {state.isPremium 
                  ? `Plan: ${state.plan?.name || 'Premium'}`
                  : state.trialDaysLeft 
                    ? `${state.trialDaysLeft} trial days left`
                    : 'Upgrade to unlock all features'
                }
              </p>
            </div>
          </div>
          
          {!state.isPremium && (
            <button
              onClick={() => setState(prev => ({ ...prev, showUpgradeModal: true }))}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFeatures.map(feature => {
          const Icon = feature.icon;
          const isAccessible = !feature.isPremium || state.isPremium;
          
          return (
            <div
              key={feature.id}
              onClick={() => handleFeatureClick(feature)}
              className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                isAccessible
                  ? 'border-green-200 bg-green-50 hover:border-green-300'
                  : 'border-gray-200 bg-gray-50 hover:border-purple-300'
              }`}
            >
              {/* Premium Badge */}
              {feature.isPremium && !state.isPremium && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                </div>
              )}

              {/* New Badge */}
              {feature.isNew && (
                <div className="absolute top-2 right-8 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  New
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  isAccessible ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isAccessible ? 'text-green-600' : 'text-purple-600'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {feature.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                  
                  <div className="mt-2">
                    {isAccessible ? (
                      <span className="inline-flex items-center text-green-600 text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-purple-600 text-sm">
                        <Crown className="w-4 h-4 mr-1" />
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Viral Growth Section */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Earn Premium Features</h3>
            <p className="text-sm opacity-90">
              Refer friends and unlock premium features for free!
            </p>
          </div>
          <Gift className="w-8 h-8" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{state.totalReferrals}</div>
            <div className="text-sm opacity-75">Successful Referrals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.min(state.totalReferrals * 10, 100)}%</div>
            <div className="text-sm opacity-75">Progress to Premium</div>
          </div>
        </div>

        <div className="bg-white/20 rounded-lg p-3 mb-4">
          <div className="text-sm mb-2">Your Referral Code:</div>
          <div className="flex items-center space-x-2">
            <code className="bg-white/20 px-3 py-1 rounded text-lg font-bold">
              {state.referralCode}
            </code>
            <button
              onClick={() => handleShare('copy')}
              className="bg-white/20 p-2 rounded hover:bg-white/30 transition-colors"
            >
              📋
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleShare('twitter')}
            className="bg-white/20 p-3 rounded-lg hover:bg-white/30 transition-colors text-center"
          >
            🐦
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="bg-white/20 p-3 rounded-lg hover:bg-white/30 transition-colors text-center"
          >
            📘
          </button>
          <button
            onClick={() => handleShare('email')}
            className="bg-white/20 p-3 rounded-lg hover:bg-white/30 transition-colors text-center"
          >
            ✉️
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="bg-white/20 p-3 rounded-lg hover:bg-white/30 transition-colors text-center"
          >
            📋
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {state.showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Upgrade to Premium</h2>
                <button
                  onClick={() => setState(prev => ({ ...prev, showUpgradeModal: false }))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div
                    key={plan.id}
                    className={`relative border-2 rounded-lg p-6 ${
                      plan.popular 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
                          Most Popular
                        </span>
                      </div>
                    )}

                    {plan.discount && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                          -{plan.discount}%
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="mb-2">
                        <span className="text-3xl font-bold">
                          ${plan.price}
                        </span>
                        <span className="text-gray-600">
                          /{plan.period}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        plan.popular
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {plan.price === 0 ? 'Current Plan' : 'Upgrade Now'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center text-sm text-gray-600">
                <p>✨ 30-day money-back guarantee</p>
                <p>🔒 Secure payment processing</p>
                <p>📱 Works on all your devices</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Feature gating utility
export function isPremiumFeature(featureId: string): boolean {
  const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
  return feature?.isPremium || false;
}

// Usage limit checker
export async function checkUsageLimit(feature: string, limit: number): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(['premiumStatus', 'usageLimits']);
    
    if (result.premiumStatus) {
      return true; // Premium users have no limits
    }

    const usage = result.usageLimits?.[feature] || 0;
    return usage < limit;
  } catch (error) {
    console.error('Failed to check usage limit:', error);
    return false;
  }
}

// Track usage for limits
export async function trackUsage(feature: string, amount: number = 1): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['usageLimits']);
    const limits = result.usageLimits || {};
    
    limits[feature] = (limits[feature] || 0) + amount;
    
    await chrome.storage.local.set({ usageLimits: limits });
    
    analytics.trackEvent('usage', 'feature_used', {
      feature,
      amount,
      total: limits[feature]
    });
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
} 