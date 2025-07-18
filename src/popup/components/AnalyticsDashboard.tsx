import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, Clock, Target, Globe, Wifi, FileText, Star, Award, Zap, Calendar } from 'lucide-react';

interface AnalyticsData {
  totalGenerated: number;
  todayGenerated: number;
  weeklyGenerated: number;
  monthlyGenerated: number;
  typeDistribution: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  mostUsedDomains: Array<{ domain: string; count: number }>;
  averageSize: number;
  favoriteColors: Array<{ color: string; count: number }>;
  streakDays: number;
  achievements: Array<{ id: string; title: string; description: string; unlockedAt: number }>;
}

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalGenerated: 0,
    todayGenerated: 0,
    weeklyGenerated: 0,
    monthlyGenerated: 0,
    typeDistribution: {},
    hourlyDistribution: {},
    mostUsedDomains: [],
    averageSize: 256,
    favoriteColors: [],
    streakDays: 0,
    achievements: []
  });

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load data from storage
      const result = await new Promise<any>(resolve => {
        chrome.storage.local.get(['qrHistory', 'analytics', 'achievements'], resolve);
      });

      const qrHistory = result.qrHistory || [];
      const savedAnalytics = result.analytics || {};
      const achievements = result.achievements || [];

      // Calculate analytics
      const now = Date.now();
      const today = new Date(now).setHours(0, 0, 0, 0);
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

      // Filter by time range
      let filteredHistory = qrHistory;
      if (timeRange === 'week') {
        filteredHistory = qrHistory.filter((qr: any) => qr.timestamp >= weekAgo);
      } else if (timeRange === 'month') {
        filteredHistory = qrHistory.filter((qr: any) => qr.timestamp >= monthAgo);
      }

      // Basic counts
      const totalGenerated = qrHistory.length;
      const todayGenerated = qrHistory.filter((qr: any) => qr.timestamp >= today).length;
      const weeklyGenerated = qrHistory.filter((qr: any) => qr.timestamp >= weekAgo).length;
      const monthlyGenerated = qrHistory.filter((qr: any) => qr.timestamp >= monthAgo).length;

      // Type distribution
      const typeDistribution: Record<string, number> = {};
      filteredHistory.forEach((qr: any) => {
        typeDistribution[qr.type] = (typeDistribution[qr.type] || 0) + 1;
      });

      // Hourly distribution
      const hourlyDistribution: Record<string, number> = {};
      filteredHistory.forEach((qr: any) => {
        const hour = new Date(qr.timestamp).getHours();
        const key = `${hour}:00`;
        hourlyDistribution[key] = (hourlyDistribution[key] || 0) + 1;
      });

      // Most used domains
      const domainCounts: Record<string, number> = {};
      filteredHistory.forEach((qr: any) => {
        if (qr.type === 'url') {
          try {
            const domain = new URL(qr.text).hostname;
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          } catch (e) {
            // Invalid URL
          }
        }
      });
      const mostUsedDomains = Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate streak
      const sortedDates = qrHistory
        .map((qr: any) => new Date(qr.timestamp).toDateString())
        .filter((date: string, index: number, arr: string[]) => arr.indexOf(date) === index)
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

      let streakDays = 0;
      const todayString = new Date().toDateString();
      const yesterdayString = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (sortedDates.includes(todayString) || sortedDates.includes(yesterdayString)) {
        let currentDate = new Date();
        if (!sortedDates.includes(todayString)) {
          currentDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        }

        while (sortedDates.includes(currentDate.toDateString())) {
          streakDays++;
          currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        }
      }

      setAnalytics({
        totalGenerated,
        todayGenerated,
        weeklyGenerated,
        monthlyGenerated,
        typeDistribution,
        hourlyDistribution,
        mostUsedDomains,
        averageSize: savedAnalytics.averageSize || 256,
        favoriteColors: savedAnalytics.favoriteColors || [],
        streakDays,
        achievements
      });

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
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

  const statCards = [
    {
      title: 'Total Generated',
      value: analytics.totalGenerated,
      icon: Target,
      gradient: 'from-blue-500 to-cyan-500',
      change: analytics.weeklyGenerated > 0 ? '+' + analytics.weeklyGenerated + ' this week' : 'No activity this week'
    },
    {
      title: 'Today',
      value: analytics.todayGenerated,
      icon: Clock,
      gradient: 'from-green-500 to-emerald-500',
      change: analytics.todayGenerated > 0 ? 'Active today' : 'No activity today'
    },
    {
      title: 'Streak',
      value: analytics.streakDays,
      icon: Zap,
      gradient: 'from-yellow-500 to-orange-500',
      change: analytics.streakDays > 1 ? 'days in a row' : analytics.streakDays === 1 ? 'day streak' : 'Start a streak!'
    },
    {
      title: 'This Month',
      value: analytics.monthlyGenerated,
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-500',
      change: analytics.monthlyGenerated > 0 ? 'Monthly total' : 'No monthly activity'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card text-center">
        <div className="flex items-center justify-center mb-3">
          <BarChart3 className="w-6 h-6 text-primary-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Usage Analytics</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Track your QR generation patterns and achievements
        </p>
      </div>

      {/* Time Range Filter */}
      <div className="glass-card">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">Time Range:</span>
          <div className="flex space-x-2">
            {[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'all', label: 'All Time' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as any)}
                className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                  timeRange === option.value
                    ? 'bg-primary-500 text-white'
                    : 'glass-button text-gray-300 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="glass-card text-center relative overflow-hidden">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-gray-400 text-sm font-medium mb-1">{stat.title}</p>
              <p className="text-gray-500 text-xs">{stat.change}</p>
              
              {/* Background decoration */}
              <div className={`absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-r ${stat.gradient} opacity-10 rounded-full blur-xl`}></div>
            </div>
          );
        })}
      </div>

      {/* Type Distribution */}
      {Object.keys(analytics.typeDistribution).length > 0 && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary-400" />
            QR Type Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.typeDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => {
                const TypeIcon = getTypeIcon(type);
                const total = Object.values(analytics.typeDistribution).reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);
                
                return (
                  <div key={type} className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 ${getTypeColor(type)} min-w-0 flex-1`}>
                      <TypeIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium capitalize">{type}</span>
                      <span className="text-xs text-gray-500">({count})</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-purple-blue transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-400 w-8 text-right">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Most Used Domains */}
      {analytics.mostUsedDomains.length > 0 && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-accent-400" />
            Top Domains
          </h3>
          <div className="space-y-2">
            {analytics.mostUsedDomains.map((domain, index) => (
              <div key={domain.domain} className="glass-dark rounded-lg p-3 flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-purple-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{domain.domain}</p>
                </div>
                <div className="text-right">
                  <p className="text-primary-400 font-semibold">{domain.count}</p>
                  <p className="text-gray-500 text-xs">codes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {analytics.achievements.length > 0 && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-400" />
            Achievements
          </h3>
          <div className="space-y-3">
            {analytics.achievements.map((achievement) => (
              <div key={achievement.id} className="glass-dark rounded-lg p-3 flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{achievement.title}</h4>
                  <p className="text-gray-400 text-sm">{achievement.description}</p>
                  <p className="text-gray-500 text-xs">
                    Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Insights */}
      <div className="glass-card bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 bg-gradient-purple-blue rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Usage Insights</h4>
            <div className="text-gray-400 text-sm space-y-1">
              {analytics.streakDays > 0 && (
                <p>🔥 You're on a {analytics.streakDays}-day streak!</p>
              )}
              {analytics.todayGenerated > 0 && (
                <p>⚡ You've generated {analytics.todayGenerated} QR codes today</p>
              )}
              {analytics.totalGenerated >= 10 && (
                <p>🎉 You're a QR generation pro with {analytics.totalGenerated} total codes!</p>
              )}
              {analytics.totalGenerated < 5 && (
                <p>🚀 Keep generating more QR codes to unlock insights!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No Data State */}
      {analytics.totalGenerated === 0 && (
        <div className="glass-card text-center py-12">
          <div className="w-16 h-16 bg-gradient-purple-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Data Yet</h3>
          <p className="text-gray-400 text-sm">
            Start generating QR codes to see your analytics here!
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;