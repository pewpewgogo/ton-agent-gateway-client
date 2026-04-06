---
name: agent-gateway
description: "Agent Gateway — TON blockchain tools. CLI (tgw) and MCP server for wallet info, transfers, jettons, NFTs, .ton DNS, prices, DEX orders, and agent wallets."
---

# Agent Gateway

Agent Gateway gives you full access to the TON blockchain. Use the `tgw` CLI from your terminal, or the MCP server for AI agent integration. All write operations require wallet approval via TON Connect.

## Setup

### CLI (recommended)

```bash
npm i -g @tongateway/cli
tgw auth
```

### MCP (for AI agents)

```bash
claude mcp add-json tongateway '{"command":"npx","args":["-y","@tongateway/mcp"],"env":{"AGENT_GATEWAY_API_URL":"https://api.tongateway.ai"}}' --scope user
```

## Authentication

### CLI

```bash
tgw auth                    # Get a connect link — open it, connect your wallet
tgw auth:complete <authId>  # Complete auth after connecting
tgw auth <token>            # Or pass a token directly
```

### MCP

1. Call `auth.request` — returns a one-time link
2. Show the link to the user — they open it and connect their wallet
3. Call `auth.get_token` with the authId — token is saved automatically

Token is stored in `~/.tongateway/token` and shared between CLI and MCP.

## Commands

### Wallet (read-only)

| CLI | MCP | Description |
|-----|-----|-------------|
| `tgw wallet info` | `wallet.info` | Wallet address, TON balance, account status |
| `tgw wallet jettons` | `wallet.jettons` | All token balances (USDT, NOT, DOGS, etc.) |
| `tgw wallet transactions` | `wallet.transactions` | Recent transaction history |
| `tgw wallet nfts` | `wallet.nfts` | NFTs owned by the wallet |

### Transfers (requires wallet approval)

| CLI | MCP | Description |
|-----|-----|-------------|
| `tgw transfer send --to <addr> --amount <n>` | `transfer.request` | Send TON (supports .ton names) |
| `tgw transfer status <id>` | `transfer.status` | Check status: pending, confirmed, rejected, expired |
| `tgw transfer pending` | `transfer.pending` | List pending transfer requests |
| `tgw transfer batch --file <path>` | `transfer.batch` | Batch transfer (up to 4, single approval) |

### Lookup (read-only)

| CLI | MCP | Description |
|-----|-----|-------------|
| `tgw lookup resolve <name>` | `lookup.resolve_name` | Resolve .ton domain to address |
| `tgw lookup price` | `lookup.price` | TON price in USD/EUR |

### DEX (requires wallet approval)

| CLI | MCP | Description |
|-----|-----|-------------|
| `tgw dex pairs` | `dex.pairs` | List available trading pairs |
| `tgw dex swap --from <t> --to <t> --amount <n> --price <p>` | `dex.create_order` | Place a limit order |
| `tgw dex swap --file orders.json` | `dex.create_order` (with orders array) | Batch orders (single approval) |
| `tgw dex swap ... --slippage <percent>` | — | Custom slippage (default: 1%) |

Supported tokens: TON, NOT, USDT, DOGS, BUILD, AGNT, CBBTC, PX, XAUT0

### Agent Wallet (autonomous — no approval needed)

| CLI | MCP | Description |
|-----|-----|-------------|
| `tgw agent deploy` | `agent_wallet.deploy` | Deploy a dedicated wallet contract |
| `tgw agent info --address <addr>` | `agent_wallet.info` | Balance, seqno, agent key status |
| `tgw agent transfer --address <addr> --to <recipient> --amount <n>` | `agent_wallet.transfer` | Send TON directly (no approval) |
| `tgw agent batch --address <addr> --file <path>` | `agent_wallet.batch_transfer` | Batch transfer (up to 255) |

## JSON Output

Every CLI command supports `--json` for scripting and AI use:

```bash
tgw --json wallet info
tgw --json wallet jettons | jq '.balances[].symbol'
tgw --json dex pairs
```

## Examples

### Check balance and tokens

```bash
tgw wallet info
# Address  EQ9d43...0c02
# Balance  823.18 TON
# Status   active

tgw wallet jettons
# Token   Balance         Address
# NOT     3,186,370.6     0:2f95...
# USDT    107.79          0:b113...
# BUILD   45,277.57       0:589d...
```

### Send TON to .ton domain

```bash
tgw lookup resolve alice.ton
# alice.ton  EQ83df...31a8

tgw transfer send --to alice.ton --amount 0.5
# Request ID  tx-def456
# To          alice.ton
# Amount      0.5 TON
# Status      pending
# Approve in your wallet app.
```

### DEX swap

```bash
tgw dex swap --from NOT --to TON --amount 10000 --price 0.000289
# Order      NOT -> TON
# Amount     10000
# Price      0.000289 TON per NOT
# Slippage   1%
# Request ID tx-abc123
# Approve in your wallet app.
```

### Batch DEX orders

```bash
tgw dex swap --file orders.json
# 3 orders placed!
# Approve in your wallet app — one signature for all orders.
```

## Important

- All CLI amounts are human-readable (e.g. `1.5` for 1.5 TON, not nanoTON)
- MCP `transfer.request` also accepts human-readable amounts and .ton names
- Transfers require wallet approval — one at a time via TonConnect
- Agent wallet transfers execute immediately without approval
- Token persists in `~/.tongateway/token` across sessions (shared between CLI and MCP)

## Security

- **All transfers require human approval** — the agent cannot spend funds without the wallet owner signing
- **No private keys** — only a session token (JWT) is stored, revocable from the dashboard
- **Open source** — all code is public

## Links

- https://tongateway.ai — website
- https://github.com/tongateway/cli — CLI source
- https://github.com/tongateway/mcp — MCP server source
- https://api.tongateway.ai/docs — API reference
