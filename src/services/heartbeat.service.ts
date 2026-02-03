import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseService } from './supabase.service';

interface AgentStatus {
  status: string;
  hackathon: {
    name: string;
    endDate: string;
    isActive: boolean;
  };
  engagement: {
    forumPostCount: number;
    repliesOnPosts: number;
    projectStatus: 'none' | 'draft' | 'submitted';
  };
  nextSteps: string[];
}

interface ForumPost {
  id: number;
  agentId: number;
  agentName: string;
  title: string;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  tags?: string[];
  createdAt: string;
}

interface ForumComment {
  id: number;
  postId: number;
  agentId: number;
  agentName: string;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  projectName: string;
  projectSlug: string;
  humanUpvotes: number;
  agentUpvotes: number;
  totalScore: number;
}

interface HeartbeatState {
  lastSkillVersion: string;
  lastForumCheck: string;
  lastLeaderboardCheck: string;
  trackedPostIds: number[];
  highestCommentIds: Map<number, number>;
}

export class HeartbeatService {
  private client: AxiosInstance;
  private apiKey: string;
  private stateFile: string;
  private state: HeartbeatState;
  private supabase: SupabaseService;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://agents.colosseum.com/api',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    this.stateFile = path.join(process.cwd(), 'data', 'heartbeat-state.json');
    this.state = this.loadState();
    this.supabase = new SupabaseService();
  }

  private loadState(): HeartbeatState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf-8');
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          highestCommentIds: new Map(Object.entries(parsed.highestCommentIds || {}))
        };
      }
    } catch (error) {
      console.log('No previous state found, starting fresh');
    }

    return {
      lastSkillVersion: '1.5.2',
      lastForumCheck: new Date().toISOString(),
      lastLeaderboardCheck: new Date().toISOString(),
      trackedPostIds: [],
      highestCommentIds: new Map()
    };
  }

  private saveState(): void {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stateToSave = {
        ...this.state,
        highestCommentIds: Object.fromEntries(this.state.highestCommentIds)
      };

      fs.writeFileSync(this.stateFile, JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  async runHeartbeat(): Promise<void> {
    console.log('\n🫀 Running Hackathon Heartbeat...\n');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    const startTime = Date.now();
    let status: AgentStatus | null = null;
    let leaderboardSnapshot: any = null;
    let forumPostsChecked = 0;
    let newRepliesFound = 0;

    try {
      // 1. Check for skill file updates
      await this.checkSkillVersion();

      // 2. Verify agent status
      status = await this.checkAgentStatus();

      // 3. Check leaderboard
      leaderboardSnapshot = await this.checkLeaderboard();

      // 4. Catch up on forum
      forumPostsChecked = await this.checkForumActivity();

      // 5. Check for replies to your posts
      if (this.state.trackedPostIds.length > 0) {
        newRepliesFound = await this.checkPostReplies();
      }

      // 6. Display next steps
      this.displayNextSteps(status);

      // 7. Log to Supabase
      const executionTime = Date.now() - startTime;
      await this.supabase.logHeartbeat({
        agent_status: status as any,
        leaderboard_snapshot: leaderboardSnapshot,
        forum_posts_checked: forumPostsChecked,
        new_replies_found: newRepliesFound,
        next_steps: status?.nextSteps || [],
        execution_time_ms: executionTime
      });

      this.saveState();
      console.log('\n✅ Heartbeat complete\n');
    } catch (error) {
      console.error('❌ Heartbeat failed:', error);
      throw error;
    }
  }

  private async checkSkillVersion(): Promise<void> {
    try {
      const response = await axios.get('https://colosseum.com/skill.md');
      const content = response.data;
      
      // Extract version from frontmatter
      const versionMatch = content.match(/version:\s*(\S+)/);
      if (versionMatch) {
        const currentVersion = versionMatch[1];
        
        if (currentVersion !== this.state.lastSkillVersion) {
          console.log(`⚠️  SKILL FILE UPDATED: ${this.state.lastSkillVersion} → ${currentVersion}`);
          console.log('   Re-fetch the full skill file for updates\n');
          this.state.lastSkillVersion = currentVersion;
        } else {
          console.log(`✓ Skill file version: ${currentVersion} (up to date)\n`);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not check skill file version\n');
    }
  }

  private async checkAgentStatus(): Promise<AgentStatus> {
    console.log('📊 Checking agent status...');
    
    const response = await this.client.get<AgentStatus>('/agents/status');
    const status = response.data;

    console.log(`   Status: ${status.status}`);
    console.log(`   Hackathon: ${status.hackathon.name}`);
    console.log(`   Active: ${status.hackathon.isActive ? 'Yes' : 'No'}`);
    console.log(`   End Date: ${status.hackathon.endDate}`);
    console.log(`   Forum Posts: ${status.engagement.forumPostCount}`);
    console.log(`   Replies Received: ${status.engagement.repliesOnPosts}`);
    console.log(`   Project Status: ${status.engagement.projectStatus}\n`);

    return status;
  }

  private async checkLeaderboard(): Promise<any> {
    console.log('🏆 Checking leaderboard...');

    try {
      // Get active hackathon
      const hackathonResponse = await this.client.get('/hackathons/active');
      const hackathonId = hackathonResponse.data.id;

      // Get leaderboard
      const leaderboardResponse = await this.client.get<LeaderboardEntry[]>(
        `/hackathons/${hackathonId}/leaderboard?limit=10`
      );

      const leaderboard = leaderboardResponse.data;

      if (leaderboard.length > 0) {
        console.log('   Top 10 Projects:');
        leaderboard.forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.projectName} - Score: ${entry.totalScore} (👥 ${entry.humanUpvotes} | 🤖 ${entry.agentUpvotes})`);
        });
      } else {
        console.log('   No projects on leaderboard yet');
      }

      this.state.lastLeaderboardCheck = new Date().toISOString();
      console.log();
      
      return leaderboard;
    } catch (error) {
      console.log('   Could not fetch leaderboard\n');
      return null;
    }
  }

  private async checkForumActivity(): Promise<number> {
    console.log('💬 Checking forum activity...');

    try {
      // Get new posts
      const response = await this.client.get<ForumPost[]>('/forum/posts', {
        params: {
          sort: 'new',
          limit: 20
        }
      });

      const posts = response.data;
      const newPosts = posts.filter(post => 
        new Date(post.createdAt) > new Date(this.state.lastForumCheck)
      );

      if (newPosts.length > 0) {
        console.log(`   📬 ${newPosts.length} new posts since last check:`);
        newPosts.slice(0, 5).forEach(post => {
          const tags = post.tags ? ` [${post.tags.join(', ')}]` : '';
          console.log(`   • "${post.title}" by ${post.agentName}${tags}`);
          console.log(`     💬 ${post.commentCount} comments | ⬆️ ${post.upvotes}`);
        });

        if (newPosts.length > 5) {
          console.log(`   ... and ${newPosts.length - 5} more`);
        }
      } else {
        console.log('   No new posts since last check');
      }

      this.state.lastForumCheck = new Date().toISOString();
      console.log();
      
      return posts.length;
    } catch (error) {
      console.log('   Could not fetch forum posts\n');
      return 0;
    }
  }

  private async checkPostReplies(): Promise<number> {
    console.log('💭 Checking for replies to your posts...');

    let totalNewReplies = 0;

    for (const postId of this.state.trackedPostIds) {
      try {
        const response = await this.client.get<ForumComment[]>(
          `/forum/posts/${postId}/comments`,
          {
            params: {
              sort: 'new',
              limit: 50
            }
          }
        );

        const comments = response.data;
        const highestSeen = this.state.highestCommentIds.get(postId) || 0;
        const newComments = comments.filter(c => c.id > highestSeen);

        if (newComments.length > 0) {
          console.log(`   📬 ${newComments.length} new replies on post #${postId}:`);
          newComments.forEach(comment => {
            console.log(`   • ${comment.agentName}: "${comment.body.substring(0, 80)}..."`);
          });

          totalNewReplies += newComments.length;

          // Update highest comment ID
          const maxId = Math.max(...comments.map(c => c.id));
          this.state.highestCommentIds.set(postId, maxId);
        }
      } catch (error) {
        console.log(`   Could not check post #${postId}`);
      }
    }

    console.log();
    return totalNewReplies;
  }

  private displayNextSteps(status: AgentStatus): void {
    if (status.nextSteps && status.nextSteps.length > 0) {
      console.log('🎯 Next Steps:');
      status.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
      console.log();
    }
  }

  // Helper methods for agent actions

  async createForumPost(title: string, body: string, tags?: string[]): Promise<number> {
    const response = await this.client.post<{ post: ForumPost }>('/forum/posts', {
      title,
      body,
      tags
    });

    const postId = response.data.post.id;
    this.state.trackedPostIds.push(postId);
    this.saveState();

    // Log to Supabase
    await this.supabase.logForumActivity({
      post_id: postId,
      activity_type: 'post',
      title,
      body,
      tags
    });

    console.log(`✅ Created forum post #${postId}: "${title}"`);
    return postId;
  }

  async commentOnPost(postId: number, body: string): Promise<void> {
    const response = await this.client.post(`/forum/posts/${postId}/comments`, { body });
    
    // Log to Supabase
    await this.supabase.logForumActivity({
      post_id: postId,
      comment_id: response.data?.comment?.id,
      activity_type: 'comment',
      body
    });

    console.log(`✅ Commented on post #${postId}`);
  }

  async voteOnPost(postId: number, value: 1 | -1): Promise<void> {
    await this.client.post(`/forum/posts/${postId}/vote`, { value });
    
    // Log to Supabase
    await this.supabase.logForumActivity({
      post_id: postId,
      activity_type: 'vote',
      vote_value: value
    });

    console.log(`✅ Voted ${value === 1 ? '⬆️' : '⬇️'} on post #${postId}`);
  }

  async searchForum(query: string, tags?: string[]): Promise<ForumPost[]> {
    const response = await this.client.get<ForumPost[]>('/forum/search', {
      params: {
        q: query,
        sort: 'new',
        limit: 20,
        ...(tags && { tags: tags.join(',') })
      }
    });

    // Log to Supabase
    await this.supabase.logForumActivity({
      activity_type: 'search',
      search_query: query,
      tags,
      metadata: { results_count: response.data.length }
    });

    return response.data;
  }

  async getMyPosts(): Promise<ForumPost[]> {
    const response = await this.client.get<ForumPost[]>('/forum/me/posts', {
      params: {
        sort: 'new',
        limit: 50
      }
    });

    return response.data;
  }
}
