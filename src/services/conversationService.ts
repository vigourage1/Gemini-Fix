export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  usedJokes: string[];
  userPreferences: {
    tone: 'casual' | 'professional' | 'friendly';
    topics: string[];
  };
  sessionStartTime: Date;
}

export class ConversationManager {
  private contexts: Map<string, ConversationContext> = new Map();

  getContext(userId: string): ConversationContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        messages: [],
        usedJokes: [],
        userPreferences: {
          tone: 'friendly',
          topics: []
        },
        sessionStartTime: new Date()
      });
    }
    return this.contexts.get(userId)!;
  }

  addMessage(userId: string, role: 'user' | 'assistant', content: string) {
    const context = this.getContext(userId);
    context.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages for context
    if (context.messages.length > 20) {
      context.messages = context.messages.slice(-20);
    }
  }

  getRecentMessages(userId: string, count: number = 10): string {
    const context = this.getContext(userId);
    const recent = context.messages.slice(-count);
    return recent.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  markJokeUsed(userId: string, jokeId: string) {
    const context = this.getContext(userId);
    context.usedJokes.push(jokeId);
  }

  getUsedJokes(userId: string): string[] {
    return this.getContext(userId).usedJokes;
  }

  clearContext(userId: string) {
    this.contexts.delete(userId);
  }
}

export const conversationManager = new ConversationManager();