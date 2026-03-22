# Agent Gateway — Client

Landing page, dashboard, and wallet connection UI for [Agent Gateway](https://tongateway.ai).

Built with vanilla HTML/CSS/JS, deployed on Cloudflare Workers.

## Pages

- **/** — landing page with install guides and terminal demo
- **/app.html** — dashboard (connect wallet, manage tokens, transaction log)
- **/docs.html** — documentation
- **/skills.html** — skill hub (Claude, Cursor, Codex, OpenClaw, MCP)
- **/skill/*.html** — individual setup guides
- **/connect.html** — one-time wallet connection for agent auth flow

## Deploy

Auto-deploys on push to `main` via GitHub Actions + Cloudflare Workers.

## Related

| Repository | Description |
|---|---|
| [@tongateway/mcp](https://github.com/tongateway/mcp) | MCP server (14 tools) |
| [ton-agent-gateway-api](https://github.com/tongateway/ton-agent-gateway-api) | API (Cloudflare Worker) |
| [ton-agent-gateway-contract](https://github.com/tongateway/ton-agent-gateway-contract) | Agent Wallet smart contract |
| [ton-agent-gateway](https://github.com/tongateway/ton-agent-gateway) | Main repo with overview |
