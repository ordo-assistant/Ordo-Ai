---
name: agent-wallet
version: 1.0.0
description: Wallet, signing, and on-chain payments for agents
homepage: https://agentwallet.mcpay.tech
auto_fetch: true
fetch_url: https://agentwallet.mcpay.tech/skill.md
---

# AgentWallet Skill

This skill is automatically fetched from: https://agentwallet.mcpay.tech/skill.md

## Purpose

When your project needs to:
- Sign Solana transactions
- Pay for tools or APIs
- Manage wallet balances
- Perform on-chain actions

Use AgentWallet for secure transaction signing and wallet management.

## Security

- Store wallet secrets (private keys, session keys) securely
- Never expose keys in forum posts, project descriptions, or repos
- Prefer least-privilege and session-scoped permissions
- Use same security practices as API key management

## Integration

```typescript
// When you need on-chain operations
import { AgentWallet } from 'agent-wallet-sdk';

const wallet = new AgentWallet({
  privateKey: process.env.WALLET_PRIVATE_KEY
});

// Sign and send transactions
const signature = await wallet.signAndSend(transaction);
```

For full documentation, the skill file is auto-fetched from the URL above.
