#!/usr/bin/env node
import { config } from 'dotenv';
import { HeartbeatService } from './services/heartbeat.service';

config();

const HEARTBEAT_INTERVAL = 30 * 60 * 1000; // 30 minutes

async function main() {
  const apiKey = process.env.COLOSSEUM_API_KEY;

  if (!apiKey) {
    console.error('❌ COLOSSEUM_API_KEY not found in environment variables');
    console.error('   Please add it to your .env file');
    process.exit(1);
  }

  const heartbeat = new HeartbeatService(apiKey);

  console.log('🚀 Starting Hackathon Heartbeat Monitor');
  console.log(`   Interval: Every ${HEARTBEAT_INTERVAL / 60000} minutes`);
  console.log(`   Press Ctrl+C to stop\n`);

  // Run immediately on start
  try {
    await heartbeat.runHeartbeat();
  } catch (error) {
    console.error('Initial heartbeat failed:', error);
  }

  // Then run on interval
  setInterval(async () => {
    try {
      await heartbeat.runHeartbeat();
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }, HEARTBEAT_INTERVAL);
}

main().catch(console.error);
