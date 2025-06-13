import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { conversationManager } from './conversationService';
import { JokeService } from './jokeService';
import { marketDataService } from './marketDataService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const genAI = new GoogleGenerativeAI('AIzaSyDQVkAyAqPuonnplLxqEhhGyW_FqjteaVw');

export const aiService = {
  async sendChatMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    // Add user message to conversation context
    conversationManager.addMessage(userId, 'user', message);
    
    // Check for specific patterns first
    const response = await this.handleSpecialQueries(message, userId, sessionId);
    if (response) {
      conversationManager.addMessage(userId, 'assistant', response);
      return response;
    }

    // Get conversation context
    const recentContext = conversationManager.getRecentMessages(userId, 8);
    
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        userId,
        sessionId,
        conversationContext: recentContext,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send chat message');
    }

    const aiResponse = data.message;
    conversationManager.addMessage(userId, 'assistant', aiResponse);
    return aiResponse;
  },

  async handleSpecialQueries(message: string, userId: string, sessionId?: string): Promise<string | null> {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Handle joke requests
    if (this.isJokeRequest(normalizedMessage)) {
      return this.handleJokeRequest(userId, normalizedMessage);
    }
    
    // Handle market data requests
    if (this.isMarketDataRequest(normalizedMessage)) {
      return await this.handleMarketDataRequest(message);
    }
    
    // Handle session switching
    if (this.isSessionSwitchRequest(normalizedMessage)) {
      return await this.handleSessionSwitch(message, userId);
    }
    
    return null;
  },

  isJokeRequest(message: string): boolean {
    const jokePatterns = [
      /tell me a joke/i,
      /joke/i,
      /funny/i,
      /make me laugh/i,
      /another one/i,
      /more joke/i,
      /that's funny/i
    ];
    
    return jokePatterns.some(pattern => pattern.test(message));
  },

  handleJokeRequest(userId: string, message: string): string {
    const usedJokes = conversationManager.getUsedJokes(userId);
    const recentMessages = conversationManager.getRecentMessages(userId, 3);
    
    // Determine if user wants another joke
    const wantsAnother = /another|more|again/i.test(message);
    
    let joke;
    if (message.includes('crypto') || message.includes('bitcoin')) {
      joke = JokeService.getRandomJoke(usedJokes, 'crypto');
    } else if (message.includes('market') || message.includes('bull') || message.includes('bear')) {
      joke = JokeService.getRandomJoke(usedJokes, 'market');
    } else {
      joke = JokeService.getRandomJoke(usedJokes, 'trading');
    }
    
    if (!joke) {
      joke = JokeService.getRandomJoke([]); // Reset if all used
    }
    
    if (joke) {
      conversationManager.markJokeUsed(userId, joke.id);
      
      let response = '';
      if (wantsAnother && recentMessages.includes('joke')) {
        response = "You're in a good mood! 😄 Here's another one:\n\n";
      } else if (recentMessages.includes('joke')) {
        response = "Glad you enjoyed that! Here's a different one:\n\n";
      }
      
      response += JokeService.formatJoke(joke);
      
      // Add a follow-up question occasionally
      if (Math.random() > 0.7) {
        response += "\n\nHow's your trading going today? Any interesting setups you're watching? 📈";
      }
      
      return response;
    }
    
    return "I'm all out of fresh jokes for now! 😅 But I'd love to help you with your trading analysis instead!";
  },

  isMarketDataRequest(message: string): boolean {
    const marketPatterns = [
      /what'?s.*price/i,
      /current.*price/i,
      /price of/i,
      /how much is/i,
      /bitcoin.*price/i,
      /btc.*price/i,
      /eth.*price/i,
      /stock price/i,
      /market price/i,
      /quote for/i
    ];
    
    return marketPatterns.some(pattern => pattern.test(message));
  },

  async handleMarketDataRequest(message: string): Promise<string> {
    const { type, symbol } = marketDataService.detectAssetType(message);
    
    if (type === 'unknown' || !symbol) {
      return "I'd love to help you get market data! Could you specify which asset you're interested in? For example:\n• \"What's Bitcoin price?\"\n• \"AAPL stock price\"\n• \"EURUSD rate\"";
    }
    
    try {
      let data = null;
      let response = '';
      
      if (type === 'crypto') {
        data = await marketDataService.getCryptoPrice(symbol);
        if (data) {
          response = marketDataService.formatPriceResponse(data, 'crypto');
          response += "\n\nLooking strong! Are you thinking of making a move? 🤔";
        }
      } else if (type === 'stock') {
        data = await marketDataService.getStockPrice(symbol);
        if (data) {
          response = marketDataService.formatPriceResponse(data, 'stock');
          response += "\n\nInteresting movement! What's your take on this? 📊";
        }
      } else if (type === 'forex') {
        const from = symbol.substring(0, 3);
        const to = symbol.substring(3, 6);
        data = await marketDataService.getForexRate(from, to);
        if (data) {
          response = marketDataService.formatPriceResponse(data, 'forex');
          response += "\n\nForex markets are always moving! Any trades planned? 💱";
        }
      }
      
      if (!data) {
        return `Sorry, I couldn't find current data for ${symbol}. The symbol might be incorrect or the market might be closed. Try checking the spelling or ask about a different asset! 🔍`;
      }
      
      return response;
    } catch (error) {
      console.error('Market data error:', error);
      return `I'm having trouble accessing live market data right now. Please try again in a moment! 📡`;
    }
  },

  isSessionSwitchRequest(message: string): boolean {
    const switchPatterns = [
      /load.*session/i,
      /switch to/i,
      /open.*session/i,
      /change to.*session/i
    ];
    
    return switchPatterns.some(pattern => pattern.test(message));
  },

  async handleSessionSwitch(message: string, userId: string): Promise<string> {
    const sessionNameMatch = message.match(/(?:load|switch to|open|change to)\s+(?:the\s+)?(.+?)\s+session/i);
    if (!sessionNameMatch) {
      return "I'd be happy to help you switch sessions! Could you tell me which session you'd like to load? For example: \"Load the BTC 5 Minute session\"";
    }
    
    const sessionName = sessionNameMatch[1];
    const sessionId = await this.switchToSession(sessionName, userId);
    
    if (sessionId) {
      return `✅ Switched to "${sessionName}" session! You can now view and analyze the trades from this session. What would you like to know about it?`;
    } else {
      return `❌ I couldn't find a session named "${sessionName}". Here are some tips:\n• Check the spelling\n• Try using part of the session name\n• Ask me to list your sessions first`;
    }
  },

  async generateSessionSummary(sessionId: string, userId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-session-summary', {
      body: {
        sessionId,
        userId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate session summary');
    }

    return data.summary;
  },

  async analyzeTradeScreenshot(imageFile: File): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/... prefix
        };
        reader.readAsDataURL(imageFile);
      });

      const prompt = `Analyze this trading screenshot and extract ALL visible trade information. Look for:
- Currency pairs, stock symbols, or crypto symbols
- Buy/Sell or Long/Short positions
- Entry and exit prices
- Lot sizes or volumes
- Profit/Loss amounts
- Open and close times if visible

Return ONLY valid JSON in this exact format:

{
  "trades": [
    {
      "symbol": "extracted_symbol_or_pair",
      "side": "Long" or "Short",
      "volume": number_or_null,
      "entryPrice": number_or_null,
      "exitPrice": number_or_null,
      "profit": number_or_null,
      "openTime": "time_string_or_null",
      "closeTime": "time_string_or_null"
    }
  ]
}

Rules:
- Convert Buy→Long, Sell→Short
- Extract only numbers (no currency symbols like $ or €)
- If multiple trades visible, include all in array
- If data not clearly visible, use null
- Return valid JSON only, no explanations
- Be very careful with number extraction`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: imageFile.type
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      try {
        // Try to parse the response as JSON
        return JSON.parse(text);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        
        // If still no valid JSON, try to find JSON-like content
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = text.substring(jsonStart, jsonEnd + 1);
          return JSON.parse(jsonStr);
        }
        
        throw new Error('Could not extract valid JSON from AI response');
      }
    } catch (error) {
      console.error('Screenshot analysis error:', error);
      throw new Error('Failed to analyze screenshot. Please ensure the image shows clear trading information.');
    }
  },

  async switchToSession(sessionName: string, userId: string): Promise<string | null> {
    try {
      // Get user's sessions
      const { data: sessions, error } = await supabase
        .from('trading_sessions')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${sessionName}%`);

      if (error || !sessions || sessions.length === 0) {
        return null;
      }

      // Return the best match (first one for now, could be improved with fuzzy matching)
      return sessions[0].id;
    } catch (error) {
      console.error('Session switching error:', error);
      return null;
    }
  },

  getGreeting(userName?: string): string {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const day = now.getDate();

    let timeGreeting = '';
    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour < 17) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    let holidayGreeting = '';
    // Christmas
    if (month === 11 && day === 25) {
      holidayGreeting = '🎄 Merry Christmas! ';
    }
    // New Year
    else if (month === 0 && day === 1) {
      holidayGreeting = '🎉 Happy New Year! ';
    }
    // Halloween
    else if (month === 9 && day === 31) {
      holidayGreeting = '🎃 Happy Halloween! ';
    }

    const name = userName ? ` ${userName}` : '';
    const greetings = [
      `${holidayGreeting}${timeGreeting}${name}! How's your trading going today?`,
      `${holidayGreeting}${timeGreeting}${name}! Ready to analyze some trades?`,
      `${holidayGreeting}${timeGreeting}${name}! What's on your trading radar today?`,
      `${holidayGreeting}${timeGreeting}${name}! Any exciting market moves catching your eye?`
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
};