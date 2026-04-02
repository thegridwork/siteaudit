# @gridwork/siteaudit

An MCP server that audits any website for accessibility (WCAG 2.1 AA / EAA), performance, SEO, design quality, and mobile responsiveness. Get actionable scores, grades, and prioritized fixes.

Built for the compliance era: EU Accessibility Act enforcement is live, EU AI Act deadline is August 2026. Every website needs auditing.

By [Gridwork](https://github.com/gridwork)

## Tools

| Tool | Description |
|------|-------------|
| `audit_site` | Full comprehensive audit across all 5 categories |
| `quick_check` | Scores and grades only — fast triage |
| `audit_accessibility` | WCAG 2.1 AA focused audit with criterion references |
| `audit_performance` | Performance analysis with actionable fixes |
| `audit_seo` | SEO check: meta, OG, structured data, etc. |
| `compare_sites` | Side-by-side comparison of two URLs |

## Install

### Claude Code
```bash
claude mcp add @gridwork/siteaudit -- node /path/to/@gridwork/siteaudit/dist/index.js
```

### Claude Desktop (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "@gridwork/siteaudit": {
      "command": "node",
      "args": ["/path/to/@gridwork/siteaudit/dist/index.js"]
    }
  }
}
```

### Cursor / Windsurf
Add to your MCP config:
```json
{
  "@gridwork/siteaudit": {
    "command": "node",
    "args": ["/path/to/@gridwork/siteaudit/dist/index.js"]
  }
}
```

## Build from Source

```bash
npm install
npm run build
```

## What It Checks

### Accessibility (30% of score)
- Language attribute, image alt text, form labels
- Heading hierarchy, link text quality, ARIA landmarks
- Skip navigation, tab order, auto-playing media
- WCAG criterion references on every issue

### Performance (20%)
- Load time, page size, DOM complexity
- Render-blocking resources, compression, caching
- Image optimization (dimensions, lazy loading)
- Resource preloading and preconnect hints

### SEO (20%)
- Title, meta description, heading structure
- Open Graph, Twitter Cards, canonical URL
- Structured data (JSON-LD), favicon
- Internal linking, robots directives

### Design Quality (15%)
- Font consistency, color system coherence
- Touch target sizes, text readability
- Visual hierarchy, CTA presence
- Dark mode support, branding elements

### Mobile (15%)
- Viewport configuration, zoom support
- Fixed-width overflow detection
- Responsive images, media queries
- Input types for mobile keyboards

## EAA Compliance Status

Every audit includes an EAA (European Accessibility Act) compliance assessment:
- **COMPLIANT**: Meets WCAG 2.1 AA baseline
- **PARTIAL**: Some issues to resolve
- **NON-COMPLIANT**: Critical accessibility failures

## License

MIT
