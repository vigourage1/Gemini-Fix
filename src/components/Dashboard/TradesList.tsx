import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Trash2, MessageSquare, Calendar, DollarSign, Target, Clock } from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/calculations';

interface TradesListProps {
  trades: Trade[];
  onDeleteTrade: (tradeId: string) => void;
}

const TradesList: React.FC<TradesListProps> = ({ trades, onDeleteTrade }) => {
  if (trades.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-xl" />
        
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No trades yet</h3>
          <p className="text-slate-500">Add your first trade to start tracking your performance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
      {/* Enhanced Header */}
      <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse" />
              Recent Trades
            </h3>
            <p className="text-slate-400 text-sm mt-1">{trades.length} trade{trades.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
              <span>Profit</span>
            </div>
            <div className="flex items-center text-red-400">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2" />
              <span>Loss</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Trades List */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <div className="divide-y divide-slate-700/50">
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative p-4 hover:bg-slate-700/30 transition-all duration-300 group"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Enhanced P/L Indicator */}
                  <div className={`relative p-3 rounded-xl shadow-lg ${
                    trade.profit_loss >= 0 
                      ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                      : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30'
                  }`}>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 rounded-xl blur-sm ${
                      trade.profit_loss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`} />
                    
                    <div className="relative">
                      {trade.profit_loss >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {/* Trade Details */}
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-semibold">
                          {formatCurrency(trade.margin)}
                        </span>
                      </div>
                      
                      <div className="w-1 h-1 bg-slate-500 rounded-full" />
                      
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {formatPercentage(trade.roi)}
                        </span>
                      </div>
                      
                      <div className="w-1 h-1 bg-slate-500 rounded-full" />
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        trade.entry_side === 'Long' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {trade.entry_side}
                      </span>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="flex items-center text-sm text-slate-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(trade.created_at).toLocaleTimeString()}</span>
                    </div>
                    
                    {/* Comments */}
                    {trade.comments && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 flex items-start text-sm text-slate-400"
                      >
                        <MessageSquare className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{trade.comments}</span>
                      </motion.div>
                    )}
                  </div>
                </div>
                
                {/* P/L Amount and Actions */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(trade.profit_loss)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {trade.profit_loss >= 0 ? 'Profit' : 'Loss'}
                    </p>
                  </div>
                  
                  {/* Delete Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDeleteTrade(trade.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              
              {/* Progress bar for ROI */}
              <div className="mt-3 relative">
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.abs(trade.roi), 100)}%` }}
                    transition={{ delay: index * 0.1, duration: 0.8 }}
                    className={`h-full rounded-full ${
                      trade.profit_loss >= 0 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                        : 'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
                  />
                </div>
                <div className="absolute -top-1 right-0 text-xs text-slate-500">
                  ROI: {Math.abs(trade.roi).toFixed(1)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Enhanced Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/30 to-slate-700/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{trades.filter(t => t.profit_loss > 0).length} wins</span>
            </div>
            <div className="flex items-center text-red-400">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span>{trades.filter(t => t.profit_loss < 0).length} losses</span>
            </div>
          </div>
          <div className="text-slate-400">
            Total: {formatCurrency(trades.reduce((sum, t) => sum + t.profit_loss, 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradesList;