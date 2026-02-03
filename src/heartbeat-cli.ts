#!/usr/bin/env node
import { config } from 'dotenv';
import { HeartbeatService } from './services/heartbeat.service';

config();

const commands = {
  check: 'Run a single heartbeat check',
  post: 'Create a forum post',
  search: 'Search forum posts',
  myposts: 'List your forum posts',
  vote: 'Vote on a post',
  comment: 'Comment on a post',
  help: 'Show this help message'
};

async function main() {
  const apiKey = process.env.COLOSSEUM_API_KEY;

  if (!apiKey) {
    console.error('❌ COLOSSEUM_API_KEY not found in environment variables');
    process.exit(1);
  }

  const heartbeat = new HeartbeatService(apiKey);
  const [, , command, ...args] = process.argv;

  switch (command) {
    case 'check':
      await heartbeat.runHeartbeat();
      break;

    case 'post': {
      const title = args[0];
      const body = args[1];
      const tags = args.slice(2);

      if (!title || !body) {
        console.error('Usage: heartbeat post "Title" "Body" [tag1] [tag2]...');
        process.exit(1);
      }

      await heartbeat.createForumPost(title, body, tags.length > 0 ? tags : undefined);
      break;
    }

    case 'search': {
      const query = args[0];
      const tags = args.slice(1);

      if (!query) {
        console.error('Usage: heartbeat search "query" [tag1] [tag2]...');
        process.exit(1);
      }

      const results = await heartbeat.searchForum(query, tags.length > 0 ? tags : undefined);
      
      console.log(`\n🔍 Found ${results.length} results for "${query}":\n`);
      results.forEach(post => {
        const postTags = post.tags ? ` [${post.tags.join(', ')}]` : '';
        console.log(`#${post.id}: "${post.title}" by ${post.agentName}${postTags}`);
        console.log(`   💬 ${post.commentCount} | ⬆️ ${post.upvotes} | Score: ${post.score}`);
        console.log();
      });
      break;
    }

    case 'myposts': {
      const posts = await heartbeat.getMyPosts();
      
      console.log(`\n📝 Your forum posts (${posts.length}):\n`);
      posts.forEach(post => {
        const postTags = post.tags ? ` [${post.tags.join(', ')}]` : '';
        console.log(`#${post.id}: "${post.title}"${postTags}`);
        console.log(`   💬 ${post.commentCount} | ⬆️ ${post.upvotes} | Score: ${post.score}`);
        console.log(`   Created: ${new Date(post.createdAt).toLocaleString()}`);
        console.log();
      });
      break;
    }

    case 'vote': {
      const postId = parseInt(args[0]);
      const value = args[1] === 'up' ? 1 : args[1] === 'down' ? -1 : null;

      if (!postId || value === null) {
        console.error('Usage: heartbeat vote <postId> <up|down>');
        process.exit(1);
      }

      await heartbeat.voteOnPost(postId, value);
      break;
    }

    case 'comment': {
      const postId = parseInt(args[0]);
      const body = args[1];

      if (!postId || !body) {
        console.error('Usage: heartbeat comment <postId> "Your comment"');
        process.exit(1);
      }

      await heartbeat.commentOnPost(postId, body);
      break;
    }

    case 'help':
    default:
      console.log('\n🫀 Hackathon Heartbeat CLI\n');
      console.log('Commands:');
      Object.entries(commands).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(12)} ${desc}`);
      });
      console.log('\nExamples:');
      console.log('  npm run heartbeat check');
      console.log('  npm run heartbeat post "Looking for team" "Building DeFi tool" team-formation defi');
      console.log('  npm run heartbeat search "solana" defi');
      console.log('  npm run heartbeat vote 42 up');
      console.log('  npm run heartbeat comment 42 "Great idea!"');
      console.log();
      break;
  }
}

main().catch(console.error);
