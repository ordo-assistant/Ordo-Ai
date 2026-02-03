import { defineConfig } from "openclaw";

export default defineConfig({
  // Environment variables
  env: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    COLOSSEUM_API_KEY: process.env.COLOSSEUM_API_KEY,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY
  },

  agent: {
    name: "Ordo",
    description: "Colosseum Hackathon Agent - Risk-aware Solana assistant",
    version: "1.0.0",
    
    systemPrompt: `You are Ordo, an AI agent participating in the Colosseum Agent Hackathon.

Core Identity:
- Competing in the Colosseum Agent Hackathon (Feb 2-12, 2026)
- Building a risk analysis tool for Solana tokens
- Focused on institutional-grade token scoring using Helius data

Hackathon Capabilities:
1. Forum Engagement: Create posts, comment, vote, search discussions
2. Project Management: Track project status, update descriptions
3. Team Collaboration: Find teammates, coordinate work
4. Leaderboard Monitoring: Track competition and vote on projects
5. Token Analysis: Risk scoring using transaction history

Your Approach:
- Engage authentically with the community
- Share progress updates every 1-2 days
- Vote on interesting projects
- Respond to comments within hours
- Build in public, iterate based on feedback

Security:
- NEVER share API keys in forum posts
- Keep project repo public for judges
- Track engagement metrics
- Follow rate limits (30 forum ops/hour, 120 votes/hour)`,
    
    capabilities: [
      "filesystem",
      "terminal",
      "web_tools",
      "browser"
    ]
  },
  
  // Model configuration using OpenRouter
  agents: {
    defaults: {
      model: {
        primary: "openrouter/anthropic/claude-sonnet-4-5"
      }
    }
  },
  
  // Browser configuration for web automation
  browser: {
    enabled: true,
    defaultProfile: "openclaw",
    headless: false,
    profiles: {
      openclaw: {
        cdpPort: 18800,
        color: "#FF4500"
      },
      hackathon: {
        cdpPort: 18801,
        color: "#0066CC"
      }
    }
  },
  
  observability: {
    langsmith: {
      enabled: !!process.env.LANGSMITH_API_KEY,
      apiKey: process.env.LANGSMITH_API_KEY,
      projectName: "ordo-hackathon",
      traceAll: true
    }
  },
  
  tools: {
    elevated: [],
    
    custom: [
      {
        name: "hackathon_heartbeat",
        description: "Run periodic hackathon sync - checks forum, leaderboard, agent status, and skill updates",
        parameters: {}
      },
      {
        name: "forum_search",
        description: "Search forum posts by query and tags",
        parameters: {
          query: { type: "string", required: true },
          tags: { type: "array", items: { type: "string" }, required: false }
        }
      },
      {
        name: "forum_post",
        description: "Create a new forum post",
        parameters: {
          title: { type: "string", required: true },
          body: { type: "string", required: true },
          tags: { type: "array", items: { type: "string" }, required: false }
        }
      },
      {
        name: "forum_comment",
        description: "Comment on a forum post",
        parameters: {
          postId: { type: "number", required: true },
          body: { type: "string", required: true }
        }
      },
      {
        name: "forum_vote",
        description: "Vote on a forum post or comment",
        parameters: {
          postId: { type: "number", required: true },
          value: { type: "number", enum: [1, -1], required: true }
        }
      },
      {
        name: "check_leaderboard",
        description: "Get current hackathon leaderboard top 10",
        parameters: {}
      },
      {
        name: "analyze_token_risk",
        description: "Analyze Solana token risk using Helius transaction data",
        parameters: {
          mintAddress: { type: "string", required: true }
        }
      },
      {
        name: "search_knowledge",
        description: "Search the knowledge base for documentation about Solana, DeFi protocols, tools, and frameworks",
        parameters: {
          query: { type: "string", required: true },
          limit: { type: "number", required: false, default: 5 }
        }
      },
      {
        name: "get_knowledge_source",
        description: "Get complete documentation for a specific source (e.g., 'helius', 'jupiter', 'openclaw')",
        parameters: {
          source: { type: "string", required: true }
        }
      }
    ]
  },
  
  memory: {
    type: "persistent",
    backend: "sqlite",
    path: "./data/ordo-memory.db",
    compaction: {
      enabled: true,
      strategy: "summarize",
      threshold: 1000
    }
  },
  
  channels: {
    slack: {
      enabled: !!process.env.SLACK_BOT_TOKEN,
      token: process.env.SLACK_BOT_TOKEN,
      channels: ["hackathon-updates", "ordo-dev"]
    }
  }
});
