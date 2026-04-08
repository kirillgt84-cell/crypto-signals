'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, Clock, Wallet, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api, Signal, AccountStats } from '@/lib/api';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon, subtitle }) => (
  <div className="bg-surface rounded-xl p-5 border border-border hover:border-accent/50 transition-all duration-300 group">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 bg-surface-elevated rounded-lg text-text-secondary group-hover:text-accent transition-colors">
        {icon}
      </div>
      {change && (
        <span className={`text-sm font-mono font-medium px-2 py-1 rounded ${
          changeType === 'positive' ? 'bg-profit/20 text-profit' : 
          changeType === 'negative' ? 'bg-loss/20 text-loss' : 'bg-gray-800 text-text-muted'
        }`}>
          {changeType === 'positive' ? '+' : ''}{change}
        </span>
      )}
    </div>
    <div>
      <p className="text-text-muted text-xs mb-1 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-text-primary font-mono">{value}</p>
      {subtitle && <p className="text-text-muted text-xs mt-1">{subtitle}</p>}
    </div>
  </div>
);

interface SignalView {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  timestamp: string;
  confidence: number;
  strategy?: string;
}

const ActiveSignal: React.FC<{ signal: SignalView }> = ({ signal }) => {
  const riskReward = Math.abs((signal.targetPrice - signal.entryPrice) / (signal.entryPrice - signal.stopPrice)).toFixed(1);
  
  return (
    <div className={`p-4 rounded-lg border ${
      signal.direction === 'long' 
        ? 'border-profit/30 bg-profit/5' 
        : 'border-loss/30 bg-loss/5'
    } hover:bg-surface-elevated transition-colors cursor-pointer`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{signal.symbol}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
            signal.direction === 'long' 
              ? 'bg-profit text-black' 
              : 'bg-loss text-white'
          }`}>
            {signal.direction}
          </span>
          <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded">
            {signal.strategy || 'Hybrid'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${signal.confidence > 70 ? 'bg-profit animate-pulse' : 'bg-yellow-500'}`} />
          <span className="text-text-muted text-sm font-mono">{signal.confidence}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-text-muted text-xs mb-1">Entry</p>
          <p className="font-mono font-medium text-text-primary">${signal.entryPrice.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs mb-1">Target</p>
          <p className={`font-mono font-medium ${signal.direction === 'long' ? 'text-profit' : 'text-loss'}`}>
            ${signal.targetPrice.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs mb-1">Stop</p>
          <p className="font-mono font-medium text-loss">${signal.stopPrice.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs mb-1">R:R</p>
          <p className="font-mono font-medium text-accent">{riskReward}:1</p>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
        <span>Opened {signal.timestamp}</span>
        <button className="text-accent hover:text-accent/80 transition-colors">
          View Details →
        </button>
      </div>
    </div>
  );
};

const MiniChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <svg className="w-full h-12" viewBox="0 0 100 30" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,30 ${data.map((v, i) => `L${(i / (data.length - 1)) * 100},${30 - ((v - min) / range) * 25}`).join(' ')} L100,30 Z`}
        fill={`url(#gradient-${color})`}
      />
      <path
        d={`M0,${30 - ((data[0] - min) / range) * 25} ${data.map((v, i) => `L${(i / (data.length - 1)) * 100},${30 - ((v - min) / range) * 25}`).join(' ')}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const Dashboard: React.FC = () => {
  const [signals, setSignals] = useState<SignalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);

  // Default metrics (will be replaced with real data later)
  const metrics = {
    portfolioValue: '$10,847.23',
    totalReturn: '+8.47%',
    totalReturnUsd: '+$847.23',
    winrate: '46.7%',
    profitFactor: '1.11',
    maxDrawdown: '-49.1%',
    avgProfit: '+1.89%',
    avgLoss: '-1.50%',
    activeTrades: 2,
    totalTrades: 108,
  };

  const recentTrades = [
    { symbol: 'BTC/USDT', pnl: '+3.67%', type: 'long', date: '2026-04-07', exit: 'TP' },
    { symbol: 'BTC/USDT', pnl: '-1.43%', type: 'long', date: '2026-04-06', exit: 'SL' },
    { symbol: 'AAPL', pnl: '+2.15%', type: 'long', date: '2026-04-05', exit: 'TP' },
    { symbol: 'BTC/USDT', pnl: '+0.40%', type: 'short', date: '2026-04-04', exit: 'Time' },
    { symbol: 'BTC/USDT', pnl: '-1.50%', type: 'short', date: '2026-04-04', exit: 'SL' },
  ];

  const equityCurve = [10000, 10200, 10150, 10400, 10350, 10600, 10500, 10800, 10700, 10847];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch active signals
        const signalsData = await api.getSignals();
        const formattedSignals: SignalView[] = signalsData.map(s => ({
          id: s.id.toString(),
          symbol: s.symbol,
          direction: s.direction as 'long' | 'short',
          entryPrice: s.entry_price,
          targetPrice: s.target_price,
          stopPrice: s.stop_price,
          timestamp: formatTimeAgo(s.created_at),
          confidence: s.confidence,
          strategy: 'Hybrid',
        }));
        setSignals(formattedSignals);

        // Try to fetch account stats (demo account id=1)
        try {
          const stats = await api.getAccountStats(1);
          setAccountStats(stats);
        } catch {
          // Account might not exist, that's ok
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-text-primary p-4 md:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            SignalStream
          </h1>
          <p className="text-text-muted mt-1 text-sm">BTC-only • Paper Trading • Hybrid Strategy</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase">Paper Balance</p>
            <p className="text-2xl font-bold font-mono text-profit">
              {accountStats ? `$${accountStats.balance.toLocaleString()}` : metrics.portfolioValue}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30">
            <Wallet className="w-6 h-6 text-accent" />
          </div>
        </div>
      </header>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          title="Total Return"
          value={metrics.totalReturnUsd}
          change="8.47%"
          changeType="positive"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Since inception"
        />
        <MetricCard
          title="Winrate"
          value={metrics.winrate}
          change={`${accountStats?.total_trades || metrics.totalTrades} trades`}
          changeType="neutral"
          icon={<Target className="w-5 h-5" />}
          subtitle="46.7% profitable"
        />
        <MetricCard
          title="Profit Factor"
          value={metrics.profitFactor}
          change="1.0+ = good"
          changeType="positive"
          icon={<BarChart3 className="w-5 h-5" />}
          subtitle="Gross profit / loss"
        />
        <MetricCard
          title="Max Drawdown"
          value={metrics.maxDrawdown}
          change="Historical"
          changeType="negative"
          icon={<TrendingDown className="w-5 h-5" />}
          subtitle="Worst peak-to-trough"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Active Signals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Signals */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Active Signals
              </h2>
              <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium">
                {signals.length} active
              </span>
            </div>
            
            {loading && (
              <div className="text-center py-8 text-text-muted">
                <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
                Loading signals...
              </div>
            )}
            
            {error && (
              <div className="text-center py-8 text-loss">
                <p>Error loading signals</p>
                <p className="text-sm text-text-muted mt-1">{error}</p>
              </div>
            )}
            
            {!loading && !error && signals.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <p>No active signals at the moment</p>
                <p className="text-sm mt-1">Check back later for new opportunities</p>
              </div>
            )}
            
            <div className="space-y-3">
              {signals.map(signal => (
                <ActiveSignal key={signal.id} signal={signal} />
              ))}
            </div>
          </div>

          {/* Strategy Stats */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-bold mb-4">Strategy Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-4 bg-surface-elevated rounded-lg border border-border">
                <p className="text-text-muted text-xs mb-1">Avg Profit</p>
                <p className="text-xl font-bold text-profit font-mono">{metrics.avgProfit}</p>
              </div>
              <div className="text-center p-4 bg-surface-elevated rounded-lg border border-border">
                <p className="text-text-muted text-xs mb-1">Avg Loss</p>
                <p className="text-xl font-bold text-loss font-mono">{metrics.avgLoss}</p>
              </div>
              <div className="text-center p-4 bg-surface-elevated rounded-lg border border-border">
                <p className="text-text-muted text-xs mb-1">Long WR</p>
                <p className="text-xl font-bold font-mono text-text-primary">46.4%</p>
              </div>
              <div className="text-center p-4 bg-surface-elevated rounded-lg border border-border">
                <p className="text-text-muted text-xs mb-1">Short WR</p>
                <p className="text-xl font-bold font-mono text-text-primary">47.0%</p>
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Equity Curve</h2>
              <span className="text-xs text-text-muted">Last 10 trades</span>
            </div>
            <MiniChart data={equityCurve} color="#22c55e" />
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Recent Trades */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Recent Trades</h2>
              <button className="text-xs text-accent hover:underline">View All</button>
            </div>
            <div className="space-y-2">
              {recentTrades.map((trade, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-border/50 hover:border-border transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{trade.symbol}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        trade.type === 'long' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">{trade.date} • {trade.exit}</p>
                  </div>
                  <div className={`flex items-center gap-1 font-mono font-bold ${
                    trade.pnl.startsWith('+') ? 'text-profit' : 'text-loss'
                  }`}>
                    {trade.pnl.startsWith('+') ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {trade.pnl}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Settings */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-bold mb-4">Risk Settings</h2>
            <div className="space-y-3">
              {[
                { label: 'Risk per trade', value: '2.0%' },
                { label: 'Stop loss', value: '2.0 ATR' },
                { label: 'Take profit', value: '4.0 ATR' },
                { label: 'Max holding', value: '24h' },
                { label: 'Position size', value: 'Fixed 2%' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-text-muted text-sm">{item.label}</span>
                  <span className="font-mono font-medium text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Market Status */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-bold mb-4">Market Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm">BTC/USDT</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">$67,450</span>
                  <span className="text-profit text-xs">+1.2%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm">Funding Rate</span>
                <span className="font-mono text-profit text-sm">+0.003%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm">Last Signal</span>
                <span className="text-xs text-text-muted">{signals.length > 0 ? signals[0].timestamp : '2h ago'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-border text-center text-text-muted text-sm">
        <p>SignalStream • Paper Trading Mode • Not Financial Advice</p>
      </footer>
    </div>
  );
};

export default Dashboard;
