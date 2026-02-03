#!/usr/bin/env node
import { config } from 'dotenv';
import * as readline from 'readline';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { HeartbeatService } from './services/heartbeat.service';
import { SupabaseService } from './services/supabase.service';

config();

interface ChatContext {
  messages: any[];
  kb: KnowledgeBaseService;
  heartbeat: HeartbeatService;
  supabase: SupabaseService;
}

class OrdoChatInterface {
  private llm: ChatOpenAI;
  private context: ChatContext;
  private rl: readline.Interface;

  constructor() {
    // Use OpenRouter API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment variables');
    }

    this.llm = new ChatOpenAI({
      modelName: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      apiKey: apiKey,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/ordo-risk-engine',
          'X-Title': 'Ordo Risk Engine'
        }
      },
      temperature: 0.7
    });

    this.context = {
      messages: [],
      kb: new KnowledgeBaseService(),
      heartbeat: new HeartbeatService(process.env.COLOSSEUM_API_KEY!),
      supabase: new SupabaseService()
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n🤖 You: '
    });
  }

  async initialize() {
    console.log('🚀 Ordo Chat Interface - Human-in-the-Loop\n');
    console.log('Initializing agent...\n');

    // Initialize Supabase
    await this.context.supabase.initializeAgentProfile();

    // Get knowledge base stats
    const totalTokens = await this.context.kb.getTotalTokens();
    const sources = await this.context.kb.listSources();

    console.log('✅ Agent initialized');
    console.log(`📚 Knowledge Base: ${sources.length} sources, ${totalTokens.toLocaleString()} tokens`);
    console.log('🎯 Ready for conversation!\n');

    // Set system prompt
    this.context.messages.push(
      new SystemMessage(`You are Ordo, an AI agent competing in the Colosseum Agent Hackathon.

Core Identity:
- Agent #93: ordo-seeker-assistant
- Building a risk analysis tool for Solana tokens
- Competing for $100,000 USDC prize pool
- Hackathon: Feb 2-12, 2026

Your Capabilities:
1. **Knowledge Base**: Access to ${totalTokens.toLocaleString()} tokens of documentation
   - Solana blockchain, DeFi protocols, tools, frameworks
   - Can search and retrieve specific documentation
   
2. **Hackathon Operations**:
   - Check forum activity and leaderboard
   - Create posts, comments, votes
   - Monitor agent status
   
3. **Token Analysis**:
   - Risk scoring using Helius transaction data
   - Market analysis and recommendations

4. **Data Persistence**:
   - All activities logged to Supabase
   - Complete audit trail

Available Commands:
- /search <query> - Search knowledge base
- /docs <source> - Get full documentation (e.g., /docs helius)
- /heartbeat - Run hackathon sync
- /forum - Check forum activity
- /leaderboard - View top 10 projects
- /stats - View your stats
- /help - Show all commands

When the user asks about Solana tools, protocols, or APIs, search the knowledge base first.
Provide accurate, cited information from the documentation.
Be conversational but informative.`)
    );

    console.log('Commands: /search, /docs, /heartbeat, /forum, /leaderboard, /stats, /help, /exit\n');
  }

  async handleCommand(input: string): Promise<string> {
    const [command, ...args] = input.split(' ');

    switch (command) {
      case '/search': {
        const query = args.join(' ');
        if (!query) return '❌ Usage: /search <query>';
        
        try {
          const results = await this.context.kb.searchText(query, 5);
          if (results.length === 0) return `No results found for "${query}"`;

          let output = `🔍 Found ${results.length} results:\n\n`;
          results.forEach((r: any, i: number) => {
            output += `${i + 1}. **${r.title}** (${r.category})\n`;
            output += `   Relevance: ${(r.rank * 100).toFixed(1)}%\n`;
            output += `   Preview: ${r.content.substring(0, 150)}...\n\n`;
          });
          return output;
        } catch (error: any) {
          console.error('Search error:', error);
          return `❌ Search failed: ${error.message}\n\nTip: Make sure knowledge base is loaded. Run: npm run load-knowledge`;
        }
      }

      case '/docs': {
        const source = args[0];
        if (!source) return '❌ Usage: /docs <source> (e.g., /docs helius)';

        const doc = await this.context.kb.getBySource(source);
        if (!doc) {
          const sources = await this.context.kb.listSources();
          const available = sources.map((s: any) => s.source).join(', ');
          return `❌ Source "${source}" not found.\n\nAvailable: ${available}`;
        }

        return `📚 **${doc.title}**\n\nCategory: ${doc.category}\nTokens: ${doc.token_count?.toLocaleString()}\n\n${doc.content.substring(0, 2000)}...\n\n(Showing first 2000 chars. Full doc available in knowledge base)`;
      }

      case '/heartbeat': {
        console.log('\n⏳ Running heartbeat check...\n');
        await this.context.heartbeat.runHeartbeat();
        return '✅ Heartbeat complete! Check output above.';
      }

      case '/forum': {
        const posts = await this.context.heartbeat.searchForum('', []);
        let output = `💬 Recent Forum Activity (${posts.length} posts):\n\n`;
        posts.slice(0, 10).forEach((p: any) => {
          output += `• "${p.title}" by ${p.agentName}\n`;
          output += `  💬 ${p.commentCount} | ⬆️ ${p.upvotes}\n\n`;
        });
        return output;
      }

      case '/leaderboard': {
        console.log('\n⏳ Fetching leaderboard...\n');
        // This would call the leaderboard API
        return '🏆 Leaderboard feature - check heartbeat output for rankings';
      }

      case '/stats': {
        const stats = await this.context.supabase.getForumActivityStats();
        const project = await this.context.supabase.getProjectStatus();
        const heartbeats = await this.context.supabase.getRecentHeartbeats(5);

        let output = '📊 **Your Stats**\n\n';
        output += `**Forum Activity:**\n`;
        output += `- Posts: ${stats.total_posts}\n`;
        output += `- Comments: ${stats.total_comments}\n`;
        output += `- Votes: ${stats.total_votes}\n`;
        output += `- Searches: ${stats.total_searches}\n\n`;

        if (project) {
          output += `**Project:**\n`;
          output += `- Name: ${project.project_name || 'Not set'}\n`;
          output += `- Status: ${project.status}\n`;
          output += `- Votes: 👥 ${project.human_upvotes} | 🤖 ${project.agent_upvotes}\n\n`;
        }

        output += `**Recent Heartbeats:** ${heartbeats.length}\n`;

        return output;
      }

      case '/help': {
        return `**Available Commands:**

**Knowledge Base:**
- /search <query> - Search documentation
- /docs <source> - Get full docs (helius, jupiter, etc.)

**Hackathon:**
- /heartbeat - Run sync check
- /forum - View recent posts
- /leaderboard - Top 10 projects
- /stats - Your activity stats

**Chat:**
- /clear - Clear conversation history
- /exit - Exit chat

**Tips:**
- Ask about Solana tools, protocols, APIs
- Request token analysis
- Get help with hackathon strategy
- Learn about DeFi protocols`;
      }

      case '/clear': {
        this.context.messages = this.context.messages.slice(0, 1); // Keep system message
        return '✅ Conversation history cleared';
      }

      default:
        return `❌ Unknown command: ${command}\nType /help for available commands`;
    }
  }

  async chat(userInput: string): Promise<string> {
    // Handle commands
    if (userInput.startsWith('/')) {
      return await this.handleCommand(userInput);
    }

    // Add user message
    this.context.messages.push(new HumanMessage(userInput));

    try {
      // Get AI response
      const response = await this.llm.invoke(this.context.messages);
      
      // Add AI message to history
      this.context.messages.push(new AIMessage(response.content));

      return response.content as string;
    } catch (error: any) {
      return `❌ Error: ${error.message}`;
    }
  }

  async start() {
    await this.initialize();

    this.rl.prompt();

    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();

      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      if (trimmed === '/exit' || trimmed === 'exit' || trimmed === 'quit') {
        console.log('\n👋 Goodbye! Agent will continue running in background.\n');
        this.rl.close();
        process.exit(0);
      }

      try {
        const response = await this.chat(trimmed);
        console.log(`\n🤖 Ordo: ${response}`);
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Chat session ended.\n');
      process.exit(0);
    });
  }
}

// Start chat interface
const chat = new OrdoChatInterface();
chat.start().catch(console.error);
