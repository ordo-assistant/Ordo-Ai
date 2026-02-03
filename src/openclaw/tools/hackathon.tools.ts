import axios, { AxiosInstance } from 'axios';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';

interface HackathonToolContext {
  apiKey: string;
}

export class HackathonTools {
  private client: AxiosInstance;
  private kb: KnowledgeBaseService;

  constructor(context: HackathonToolContext) {
    this.client = axios.create({
      baseURL: 'https://agents.colosseum.com/api',
      headers: {
        'Authorization': `Bearer ${context.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    this.kb = new KnowledgeBaseService();
  }

  /**
   * Run periodic hackathon heartbeat check
   */
  async hackathon_heartbeat(): Promise<string> {
    const results: string[] = [];

    try {
      // 1. Check agent status
      const statusResponse = await this.client.get('/agents/status');
      const status = statusResponse.data;

      results.push('📊 Agent Status:');
      results.push(`   Status: ${status.status}`);
      results.push(`   Hackathon: ${status.hackathon.name}`);
      results.push(`   Active: ${status.hackathon.isActive ? 'Yes' : 'No'}`);
      results.push(`   Forum Posts: ${status.engagement.forumPostCount}`);
      results.push(`   Replies: ${status.engagement.repliesOnPosts}`);
      results.push(`   Project: ${status.engagement.projectStatus}`);

      if (status.nextSteps && status.nextSteps.length > 0) {
        results.push('\n🎯 Next Steps:');
        status.nextSteps.forEach((step: string, i: number) => {
          results.push(`   ${i + 1}. ${step}`);
        });
      }

      // 2. Check leaderboard
      const hackathonResponse = await this.client.get('/hackathons/active');
      const leaderboardResponse = await this.client.get(
        `/hackathons/${hackathonResponse.data.id}/leaderboard?limit=10`
      );

      results.push('\n🏆 Leaderboard Top 10:');
      leaderboardResponse.data.forEach((entry: any, i: number) => {
        results.push(`   ${i + 1}. ${entry.projectName} - Score: ${entry.totalScore}`);
      });

      // 3. Check forum activity
      const forumResponse = await this.client.get('/forum/posts', {
        params: { sort: 'new', limit: 10 }
      });

      results.push('\n💬 Recent Forum Posts:');
      forumResponse.data.slice(0, 5).forEach((post: any) => {
        const tags = post.tags ? ` [${post.tags.join(', ')}]` : '';
        results.push(`   • "${post.title}" by ${post.agentName}${tags}`);
        results.push(`     💬 ${post.commentCount} | ⬆️ ${post.upvotes}`);
      });

      return results.join('\n');
    } catch (error: any) {
      return `❌ Heartbeat failed: ${error.message}`;
    }
  }

  /**
   * Search forum posts
   */
  async forum_search(query: string, tags?: string[]): Promise<string> {
    try {
      const response = await this.client.get('/forum/search', {
        params: {
          q: query,
          sort: 'new',
          limit: 20,
          ...(tags && tags.length > 0 && { tags: tags.join(',') })
        }
      });

      const posts = response.data;
      const results: string[] = [`🔍 Found ${posts.length} results for "${query}":\n`];

      posts.forEach((post: any) => {
        const postTags = post.tags ? ` [${post.tags.join(', ')}]` : '';
        results.push(`#${post.id}: "${post.title}" by ${post.agentName}${postTags}`);
        results.push(`   💬 ${post.commentCount} | ⬆️ ${post.upvotes} | Score: ${post.score}`);
        results.push('');
      });

      return results.join('\n');
    } catch (error: any) {
      return `❌ Search failed: ${error.message}`;
    }
  }

  /**
   * Create a forum post
   */
  async forum_post(title: string, body: string, tags?: string[]): Promise<string> {
    try {
      const response = await this.client.post('/forum/posts', {
        title,
        body,
        tags
      });

      const post = response.data.post;
      return `✅ Created forum post #${post.id}: "${post.title}"\n   View at: https://colosseum.com/agent-hackathon/forum/${post.id}`;
    } catch (error: any) {
      return `❌ Failed to create post: ${error.message}`;
    }
  }

  /**
   * Comment on a forum post
   */
  async forum_comment(postId: number, body: string): Promise<string> {
    try {
      const response = await this.client.post(`/forum/posts/${postId}/comments`, {
        body
      });

      const comment = response.data.comment;
      return `✅ Commented on post #${postId} (comment #${comment.id})`;
    } catch (error: any) {
      return `❌ Failed to comment: ${error.message}`;
    }
  }

  /**
   * Vote on a forum post
   */
  async forum_vote(postId: number, value: 1 | -1): Promise<string> {
    try {
      await this.client.post(`/forum/posts/${postId}/vote`, { value });
      return `✅ Voted ${value === 1 ? '⬆️' : '⬇️'} on post #${postId}`;
    } catch (error: any) {
      return `❌ Failed to vote: ${error.message}`;
    }
  }

  /**
   * Check leaderboard
   */
  async check_leaderboard(): Promise<string> {
    try {
      const hackathonResponse = await this.client.get('/hackathons/active');
      const leaderboardResponse = await this.client.get(
        `/hackathons/${hackathonResponse.data.id}/leaderboard?limit=10`
      );

      const results: string[] = ['🏆 Hackathon Leaderboard:\n'];

      leaderboardResponse.data.forEach((entry: any, i: number) => {
        results.push(`${i + 1}. ${entry.projectName}`);
        results.push(`   Score: ${entry.totalScore} (👥 ${entry.humanUpvotes} | 🤖 ${entry.agentUpvotes})`);
        results.push(`   Slug: ${entry.projectSlug}`);
        results.push('');
      });

      return results.join('\n');
    } catch (error: any) {
      return `❌ Failed to fetch leaderboard: ${error.message}`;
    }
  }

  /**
   * Search knowledge base
   */
  async search_knowledge(query: string, limit: number = 5): Promise<string> {
    try {
      const results = await this.kb.searchText(query, limit);

      if (results.length === 0) {
        return `No results found for "${query}"`;
      }

      const output: string[] = [`🔍 Found ${results.length} results for "${query}":\n`];

      results.forEach((result: any, i: number) => {
        output.push(`${i + 1}. ${result.title} (${result.category})`);
        output.push(`   Source: ${result.source}`);
        output.push(`   Relevance: ${(result.rank * 100).toFixed(1)}%`);
        
        // Show first 200 characters of content
        const preview = result.content.substring(0, 200).replace(/\n/g, ' ');
        output.push(`   Preview: ${preview}...`);
        output.push('');
      });

      output.push(`\nTo get full documentation: get_knowledge_source(source: "${results[0].source}")`);

      return output.join('\n');
    } catch (error: any) {
      return `❌ Knowledge search failed: ${error.message}`;
    }
  }

  /**
   * Get full documentation for a source
   */
  async get_knowledge_source(source: string): Promise<string> {
    try {
      const doc = await this.kb.getBySource(source);

      if (!doc) {
        const available = await this.kb.listSources();
        const sources = available.map((s: any) => s.source).join(', ');
        return `❌ Source "${source}" not found.\n\nAvailable sources: ${sources}`;
      }

      const output: string[] = [
        `📚 ${doc.title}`,
        `Category: ${doc.category}`,
        `Tokens: ${doc.token_count?.toLocaleString() || 'unknown'}`,
        '',
        '--- DOCUMENTATION ---',
        '',
        doc.content
      ];

      return output.join('\n');
    } catch (error: any) {
      return `❌ Failed to get source: ${error.message}`;
    }
  }
}

/**
 * Register tools with OpenClaw
 */
export function registerHackathonTools(openclaw: any) {
  const apiKey = process.env.COLOSSEUM_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  COLOSSEUM_API_KEY not found - hackathon tools disabled');
    return;
  }

  const tools = new HackathonTools({ apiKey });

  openclaw.registerTool('hackathon_heartbeat', async () => {
    return await tools.hackathon_heartbeat();
  });

  openclaw.registerTool('forum_search', async (params: { query: string; tags?: string[] }) => {
    return await tools.forum_search(params.query, params.tags);
  });

  openclaw.registerTool('forum_post', async (params: { title: string; body: string; tags?: string[] }) => {
    return await tools.forum_post(params.title, params.body, params.tags);
  });

  openclaw.registerTool('forum_comment', async (params: { postId: number; body: string }) => {
    return await tools.forum_comment(params.postId, params.body);
  });

  openclaw.registerTool('forum_vote', async (params: { postId: number; value: 1 | -1 }) => {
    return await tools.forum_vote(params.postId, params.value);
  });

  openclaw.registerTool('check_leaderboard', async () => {
    return await tools.check_leaderboard();
  });

  openclaw.registerTool('search_knowledge', async (params: { query: string; limit?: number }) => {
    return await tools.search_knowledge(params.query, params.limit);
  });

  openclaw.registerTool('get_knowledge_source', async (params: { source: string }) => {
    return await tools.get_knowledge_source(params.source);
  });

  console.log('✅ Registered hackathon tools');
}

