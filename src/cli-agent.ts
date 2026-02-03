/**
 * CLI Interface for Ordo ReAct Agent
 * Interactive token risk analysis with reasoning
 */

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { ReActAgent } from './agents/react-agent';

dotenv.config();

async function main() {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!heliusApiKey) {
    console.error('❌ Error: HELIUS_API_KEY not found in .env file');
    process.exit(1);
  }

  if (!openRouterApiKey) {
    console.error('❌ Error: OPENROUTER_API_KEY not found in .env file');
    console.log('\nThe ReAct agent requires an OpenRouter API key for LLM reasoning.');
    console.log('Get one free at: https://openrouter.ai');
    console.log('\nFalling back to rule-based reasoning...\n');
  }

  console.log('🛡️  Ordo ReAct Agent - Interactive Token Risk Analysis\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('I am Ordo, your AI token risk analyst. I use the ReAct');
  console.log('(Reasoning + Acting) framework to analyze Solana tokens.\n');
  console.log('Examples:');
  console.log('  • "Analyze token So11111111111111111111111111111111111111112"');
  console.log('  • "Is EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v safe?"');
  console.log('  • "Compare token A and token B"');
  console.log('\nType "exit" to quit\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize agent
  const agent = new ReActAgent(
    heliusApiKey,
    openRouterApiKey || 'fallback',
    process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
  );

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🤖 You: ',
  });

  rl.prompt();

  rl.on('line', async (input: string) => {
    const query = input.trim();

    if (!query) {
      rl.prompt();
      return;
    }

    if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
      console.log('\n👋 Goodbye! Stay safe in DeFi!\n');
      rl.close();
      process.exit(0);
    }

    try {
      console.log(''); // Empty line for spacing
      const answer = await agent.run(query);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      console.log('\nPlease try again or check your API keys.\n');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!\n');
    process.exit(0);
  });
}

main();
