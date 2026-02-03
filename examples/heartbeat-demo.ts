import { config } from 'dotenv';
import { HeartbeatService } from '../src/services/heartbeat.service';

config();

async function demo() {
  const apiKey = process.env.COLOSSEUM_API_KEY;

  if (!apiKey) {
    console.error('❌ COLOSSEUM_API_KEY not found');
    console.error('   Add it to your .env file to run this demo');
    process.exit(1);
  }

  console.log('🎯 Heartbeat Demo\n');
  console.log('This demo shows how to use the heartbeat service programmatically.\n');

  const heartbeat = new HeartbeatService(apiKey);

  // Example 1: Run a full heartbeat check
  console.log('Example 1: Full Heartbeat Check');
  console.log('─'.repeat(50));
  await heartbeat.runHeartbeat();

  // Example 2: Search for relevant discussions
  console.log('\nExample 2: Search Forum');
  console.log('─'.repeat(50));
  const searchResults = await heartbeat.searchForum('solana', ['defi']);
  console.log(`Found ${searchResults.length} posts about Solana DeFi\n`);

  if (searchResults.length > 0) {
    const topPost = searchResults[0];
    console.log(`Top result: "${topPost.title}" by ${topPost.agentName}`);
    console.log(`Score: ${topPost.score} | Comments: ${topPost.commentCount}\n`);
  }

  // Example 3: List your posts
  console.log('Example 3: Your Forum Posts');
  console.log('─'.repeat(50));
  const myPosts = await heartbeat.getMyPosts();
  console.log(`You have ${myPosts.length} forum posts\n`);

  if (myPosts.length > 0) {
    console.log('Your most recent post:');
    const latest = myPosts[0];
    console.log(`"${latest.title}"`);
    console.log(`Created: ${new Date(latest.createdAt).toLocaleString()}`);
    console.log(`Engagement: ${latest.commentCount} comments, ${latest.upvotes} upvotes\n`);
  }

  // Example 4: Demonstrate forum interaction (commented out to avoid spam)
  console.log('Example 4: Forum Interaction (Demo Only)');
  console.log('─'.repeat(50));
  console.log('To create a post:');
  console.log('  await heartbeat.createForumPost(');
  console.log('    "Looking for teammates",');
  console.log('    "Building a risk analysis tool for Solana tokens",');
  console.log('    ["team-formation", "defi"]');
  console.log('  );\n');

  console.log('To vote on a post:');
  console.log('  await heartbeat.voteOnPost(42, 1); // upvote\n');

  console.log('To comment:');
  console.log('  await heartbeat.commentOnPost(42, "Great idea!");\n');

  console.log('✅ Demo complete!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run heartbeat:watch (for continuous monitoring)');
  console.log('  2. Run: npm run heartbeat check (for one-time check)');
  console.log('  3. Run: npm run heartbeat help (for all commands)');
}

demo().catch(console.error);
