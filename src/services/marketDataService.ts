export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
}

export interface ForexRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

class MarketDataService {
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
  private readonly ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with actual key

  // Crypto price mapping for common symbols
  private readonly CRYPTO_MAPPING: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'XRP': 'ripple',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'ATOM': 'cosmos',
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu'
  };

  async getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
    try {
      const coinId = this.CRYPTO_MAPPING[symbol.toUpperCase()] || symbol.toLowerCase();
      
      const response = await fetch(
        `${this.COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto price');
      }
      
      const data = await response.json();
      const coinData = data[coinId];
      
      if (!coinData) {
        return null;
      }
      
      return {
        id: coinId,
        symbol: symbol.toUpperCase(),
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        current_price: coinData.usd,
        price_change_24h: coinData.usd_24h_change || 0,
        price_change_percentage_24h: coinData.usd_24h_change || 0,
        last_updated: new Date(coinData.last_updated_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error fetching crypto price:', error);
      return null;
    }
  }

  async getStockPrice(symbol: string): Promise<StockQuote | null> {
    try {
      const response = await fetch(
        `${this.ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock price');
      }
      
      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        return null;
      }
      
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
      
      return {
        symbol: symbol.toUpperCase(),
        price,
        change,
        changePercent,
        volume: parseInt(quote['06. volume']),
        lastUpdated: quote['07. latest trading day']
      };
    } catch (error) {
      console.error('Error fetching stock price:', error);
      return null;
    }
  }

  async getForexRate(from: string, to: string = 'USD'): Promise<ForexRate | null> {
    try {
      const response = await fetch(
        `${this.ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch forex rate');
      }
      
      const data = await response.json();
      const exchangeRate = data['Realtime Currency Exchange Rate'];
      
      if (!exchangeRate) {
        return null;
      }
      
      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: parseFloat(exchangeRate['5. Exchange Rate']),
        change: 0, // Alpha Vantage doesn't provide 24h change for forex in this endpoint
        changePercent: 0,
        lastUpdated: exchangeRate['6. Last Refreshed']
      };
    } catch (error) {
      console.error('Error fetching forex rate:', error);
      return null;
    }
  }

  // Smart detection of what type of asset the user is asking about
  detectAssetType(query: string): { type: 'crypto' | 'stock' | 'forex' | 'unknown', symbol: string } {
    const normalizedQuery = query.toLowerCase();
    
    // Common crypto keywords
    if (normalizedQuery.includes('bitcoin') || normalizedQuery.includes('btc')) {
      return { type: 'crypto', symbol: 'BTC' };
    }
    if (normalizedQuery.includes('ethereum') || normalizedQuery.includes('eth')) {
      return { type: 'crypto', symbol: 'ETH' };
    }
    
    // Extract symbol patterns
    const symbolMatch = query.match(/\b([A-Z]{2,5})\b/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      
      // Check if it's a known crypto
      if (this.CRYPTO_MAPPING[symbol]) {
        return { type: 'crypto', symbol };
      }
      
      // Check for forex pairs
      if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
        return { type: 'forex', symbol };
      }
      
      // Assume it's a stock
      return { type: 'stock', symbol };
    }
    
    return { type: 'unknown', symbol: '' };
  }

  formatPriceResponse(data: CryptoPrice | StockQuote | ForexRate, type: 'crypto' | 'stock' | 'forex'): string {
    if (type === 'crypto') {
      const crypto = data as CryptoPrice;
      const changeEmoji = crypto.price_change_percentage_24h >= 0 ? '📈' : '📉';
      const changeSign = crypto.price_change_percentage_24h >= 0 ? '+' : '';
      
      return `🔸 **${crypto.name} (${crypto.symbol})**: $${crypto.current_price.toLocaleString()}
${changeEmoji} **24h Change**: ${changeSign}${crypto.price_change_percentage_24h.toFixed(2)}% (${changeSign}$${crypto.price_change_24h.toFixed(2)})
⏰ **Last Updated**: ${new Date(crypto.last_updated).toLocaleTimeString()}`;
    }
    
    if (type === 'stock') {
      const stock = data as StockQuote;
      const changeEmoji = stock.changePercent >= 0 ? '📈' : '📉';
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      
      return `📊 **${stock.symbol}**: $${stock.price.toFixed(2)}
${changeEmoji} **Change**: ${changeSign}${stock.changePercent.toFixed(2)}% (${changeSign}$${stock.change.toFixed(2)})
📈 **Volume**: ${stock.volume.toLocaleString()}
⏰ **Last Updated**: ${stock.lastUpdated}`;
    }
    
    if (type === 'forex') {
      const forex = data as ForexRate;
      
      return `💱 **${forex.from}/${forex.to}**: ${forex.rate.toFixed(4)}
⏰ **Last Updated**: ${new Date(forex.lastUpdated).toLocaleTimeString()}`;
    }
    
    return 'Unable to format price data';
  }
}

export const marketDataService = new MarketDataService();