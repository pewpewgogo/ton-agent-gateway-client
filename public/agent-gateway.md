---
name: agent-gateway
description: Agent Gateway — lets your AI agent interact with TON blockchain. Request transfers, check balances, view jettons/NFTs, resolve .ton domains, get prices. Wallet owner approves transactions on their phone.
---

# Agent Gateway

Agent Gateway gives you tools to interact with TON blockchain on behalf of a wallet owner. You can check balances, view tokens and NFTs, resolve .ton names, and request transfers that the owner approves on their phone.

## Authentication

If you don't have a token configured, use the auth flow:

1. Call `request_auth` — you'll get a one-time link
2. Ask the user to open the link and connect their wallet
3. Call `get_auth_token` with the authId — you'll get a token
4. All other tools now work automatically

## Tools

### Wallet

| Tool | Params | Description |
|------|--------|-------------|
| `get_wallet_info` | — | Get wallet address, TON balance, account status |
| `get_jetton_balances` | — | List all token balances (USDT, NOT, etc.) |
| `get_transactions` | `limit?` (number) | Recent transaction history |
| `get_nft_items` | — | List NFTs owned by the wallet |

### Transfers

| Tool | Params | Description |
|------|--------|-------------|
| `request_transfer` | `to` (string), `amountNano` (string) | Queue a TON transfer for owner approval |
| `get_request_status` | `id` (string) | Check transfer status: pending, confirmed, rejected, expired |
| `list_pending_requests` | — | List all pending transfer requests |

### Lookup

| Tool | Params | Description |
|------|--------|-------------|
| `resolve_name` | `domain` (string) | Resolve .ton domain to address (e.g. "alice.ton") |
| `get_ton_price` | `currencies?` (string) | Get TON price in USD/EUR/etc. |

### Auth

| Tool | Params | Description |
|------|--------|-------------|
| `request_auth` | `label?` (string) | Generate a one-time auth link for wallet connection |
| `get_auth_token` | `authId` (string) | Retrieve token after user connects wallet |

## Amount conversion

Amounts are in **nanoTON**: 1 TON = 1,000,000,000 nanoTON

| TON | nanoTON |
|-----|---------|
| 0.1 | 100000000 |
| 0.5 | 500000000 |
| 1 | 1000000000 |
| 10 | 10000000000 |

## Usage examples

### Check wallet

```
get_wallet_info()
→ Address: 0:9d43...0c02
→ Balance: 823.18 TON
→ Status: active
```

### Send TON

```
request_transfer({ to: "EQD...address", amountNano: "1000000000" })
→ Transfer request created (ID: abc-123)
→ The wallet owner will approve it on their phone
```

### Send to .ton domain

```
resolve_name({ domain: "alice.ton" })
→ alice.ton → 0:83df...31a8

request_transfer({ to: "0:83df...31a8", amountNano: "500000000" })
```

### Check price before sending

```
get_ton_price({ currencies: "USD" })
→ 1 TON = 2.45 USD
```

## Important

- **You cannot sign transactions.** You can only request them. The wallet owner approves on their phone.
- **Requests expire in 5 minutes.** If not approved in time, they expire automatically.
- **Token = session.** Guard it like a password. Tokens remain valid until revoked.
- **Use resolve_name** when the user gives a .ton domain instead of a raw address.

## API docs

Full REST API documentation: https://api.tongateway.ai/docs
