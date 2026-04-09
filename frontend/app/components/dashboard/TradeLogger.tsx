'use client';

import React, { useState } from 'react';
import { Plus, Save, History, TrendingUp, TrendingDown } from 'lucide-react';

interface Trade {
  id?: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  stop_price: number;
  target_price: number;
  quantity: number;
  notes: string;
  timestamp?: string;
}

export default function TradeLogger() {
  const [showForm, setShowForm] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [formData, setFormData] = useState<Trade>({
    symbol: 'BTC/USDT',
    direction: 'long',
    entry_price: 0,
    stop_price: 0,
    target_price: 0,
    quantity: 0,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrade: Trade = {
      ...formData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setTrades([newTrade, ...trades]);
    setShowForm(false);
    // TODO: Отправить на backend
  };

  const calculateRR = () => {
    if (!formData.entry_price || !formData.stop_price || !formData.target_price) return 0;
    const risk = Math.abs(formData.entry_price - formData.stop_price);
    const reward = Math.abs(formData.target_price - formData.entry_price);
    return risk > 0 ? (reward / risk).toFixed(1) : '0';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-500" />
          Trade Logger
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Log Trade
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Symbol */}
            <div>
              <label className="text-gray-400 text-xs uppercase block mb-1">Symbol</label>
              <select
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="SOL/USDT">SOL/USDT</option>
              </select>
            </div>

            {/* Direction */}
            <div>
              <label className="text-gray-400 text-xs uppercase block mb-1">Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, direction: 'long'})}
                  className={`flex-1 py-2 rounded flex items-center justify-center gap-1 ${
                    formData.direction === 'long' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Long
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, direction: 'short'})}
                  className={`flex-1 py-2 rounded flex items-center justify-center gap-1 ${
                    formData.direction === 'short' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Short
                </button>
              </div>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-xs uppercase block mb-1">Entry</label>
              <input
                type="number"
                step="0.01"
                value={formData.entry_price || ''}
                onChange={(e) => setFormData({...formData, entry_price: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase block mb-1">Stop</label>
              <input
                type="number"
                step="0.01"
                value={formData.stop_price || ''}
                onChange={(e) => setFormData({...formData, stop_price: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase block mb-1">Target</label>
              <input
                type="number"
                step="0.01"
                value={formData.target_price || ''}
                onChange={(e) => setFormData({...formData, target_price: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quantity & R:R */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs uppercase block mb-1">Quantity</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono"
                placeholder="0.000"
              />
            </div>
            <div className="flex items-end">
              <div className="bg-gray-700 rounded px-4 py-2">
                <span className="text-gray-400 text-xs uppercase">R:R Ratio</span>
                <span className="ml-2 font-bold text-cyan-400">{calculateRR()}:1</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-gray-400 text-xs uppercase block mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              rows={2}
              placeholder="Setup description..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" /> Save Trade
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Trades List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {trades.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No trades logged yet</p>
        ) : (
          trades.map((trade) => (
            <div 
              key={trade.id}
              className={`p-3 rounded-lg border ${
                trade.direction === 'long' 
                  ? 'bg-green-900/20 border-green-800' 
                  : 'bg-red-900/20 border-red-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{trade.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    trade.direction === 'long' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {trade.direction.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(trade.timestamp || '').toLocaleTimeString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-gray-400">Entry:</span>
                  <span className="ml-1 text-white">${trade.entry_price}</span>
                </div>
                <div>
                  <span className="text-gray-400">Stop:</span>
                  <span className="ml-1 text-red-400">${trade.stop_price}</span>
                </div>
                <div>
                  <span className="text-gray-400">Target:</span>
                  <span className="ml-1 text-green-400">${trade.target_price}</span>
                </div>
              </div>
              {trade.notes && (
                <p className="mt-2 text-xs text-gray-400 italic">{trade.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
