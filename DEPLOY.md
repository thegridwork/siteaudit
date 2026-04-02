# Deployment Guide — @gridwork/siteaudit

All publishing under a brand name. No personal identity connection.

## Quick Start (test locally right now)

The server is built and ready. Test it in Claude Code:

```bash
claude mcp add siteaudit-mcp -- node /path/to/siteaudit-mcp/dist/index.js
```

Then in any Claude Code conversation, ask: "audit https://example.com"

## Path to Revenue

### Step 1: Publish to npm (free distribution → install base)

```bash
# Login to brand npm account
npm adduser

# Publish
npm publish
```

Organic discovery via npm search. Free local use builds install base and trust.

### Step 2: MCPize (paid tier, 85% revenue share)

```bash
# Install MCPize CLI
npm install -g mcpize

# Login with brand account
mcpize login

# Initialize monetization
mcpize init

# Deploy
mcpize deploy

# Set pricing ($19/mo) via MCPize dashboard
```

MCPize handles: hosting, scaling, Stripe billing, tax compliance, monthly payouts.

### Step 3: AgentStore (USDC payments, 80% revenue share)

```bash
# Publish via CLI — pseudonymous, USDC payouts
# Follow AgentStore CLI instructions
```

## Distribution Checklist (all anonymous)

Submit to these directories (listing on 5+ = 10x installs):

- [ ] **npm** — `npm publish` (brand account)
- [ ] **GitHub** — Public repo under brand org, add `mcp-server` topic
- [ ] **MCPize** — `mcpize deploy` (monetized)
- [ ] **MCP Market** — mcpmarket.com (submit via form)
- [ ] **PulseMCP** — pulsemcp.com (submit via form)
- [ ] **Smithery** — smithery.ai (submit via GitHub)
- [ ] **mcp.so** — mcp.so (submit via form)
- [ ] **Claude Marketplaces** — claudemarketplaces.com
- [ ] **AgentStore** — CLI publish, USDC payouts
- [ ] **Awesome MCP Servers** — mcpservers.org (GitHub PR)

## SEO (optional, anonymous)

- [ ] Anonymous dev.to post: "Building an MCP Server for EAA Compliance Auditing"
- [ ] Simple landing page under brand domain (~$12/yr)

## Accounts Needed

Brand: **Gridwork** | Email: `thegridwork@proton.me`

- [x] **Proton Mail** — thegridwork@proton.me
- [ ] **npm account** — npmjs.com, username `gridwork`, use proton email
- [ ] **GitHub org** — github.com/gridwork, use proton email
- [ ] **MCPize account** — mcpize.com (needs Stripe Connect for payouts)
- [ ] **Coinbase CDP** — for x402 (backend-only, can use personal account)
- [ ] **Cloudflare** — for Workers deployment (can use existing account)
