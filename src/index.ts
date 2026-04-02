#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runFullAudit, formatAuditReport } from "./audit.js";
import { fetchPage } from "./fetcher.js";
import { auditAccessibility } from "./auditors/accessibility.js";
import { auditPerformance } from "./auditors/performance.js";
import { auditSEO } from "./auditors/seo.js";
import { auditDesign } from "./auditors/design.js";
import { auditMobile } from "./auditors/mobile.js";

const server = new McpServer({
  name: "@gridwork/siteaudit",
  version: "1.0.0",
});

// === Tool: Full Site Audit ===
server.tool(
  "audit_site",
  "Run a comprehensive site audit covering accessibility (WCAG 2.1 AA / EAA), performance, SEO, design quality, and mobile responsiveness. Returns scores, grades, and prioritized fixes.",
  {
    url: z
      .string()
      .describe("The URL to audit (e.g., https://example.com)"),
    format: z
      .enum(["report", "json"])
      .default("report")
      .describe("Output format: 'report' for readable markdown, 'json' for structured data"),
  },
  async ({ url, format }) => {
    try {
      const result = await runFullAudit(url);
      const output =
        format === "json"
          ? JSON.stringify(result, null, 2)
          : formatAuditReport(result);
      return { content: [{ type: "text", text: output }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Audit failed: ${msg}` }],
        isError: true,
      };
    }
  }
);

// === Tool: Quick Check (scores only, no details) ===
server.tool(
  "quick_check",
  "Get a quick overview of a site's health — scores and grades only, no detailed issues. Fast way to triage a URL.",
  {
    url: z.string().describe("The URL to check"),
  },
  async ({ url }) => {
    try {
      const result = await runFullAudit(url);
      const summary = [
        `# Quick Check: ${result.url}`,
        "",
        `**Overall: ${result.overallGrade} (${result.overallScore}/100)**`,
        "",
        `| Category | Score | Grade |`,
        `|----------|-------|-------|`,
        `| Accessibility | ${result.accessibility.score} | ${result.accessibility.grade} |`,
        `| Performance | ${result.performance.score} | ${result.performance.grade} |`,
        `| SEO | ${result.seo.score} | ${result.seo.grade} |`,
        `| Design | ${result.design.score} | ${result.design.grade} |`,
        `| Mobile | ${result.mobile.score} | ${result.mobile.grade} |`,
        "",
        `**EAA Compliance: ${result.eaaCompliance.status.toUpperCase()}**`,
        "",
        `Top issue: ${result.topPriorities[0]?.message || "None"}`,
      ];
      return { content: [{ type: "text", text: summary.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Check failed: ${msg}` }],
        isError: true,
      };
    }
  }
);

// === Tool: Accessibility Audit Only ===
server.tool(
  "audit_accessibility",
  "Run an accessibility-focused audit against WCAG 2.1 AA criteria and EAA (European Accessibility Act) requirements. Returns issues with WCAG criterion references and fixes.",
  {
    url: z.string().describe("The URL to audit for accessibility"),
  },
  async ({ url }) => {
    try {
      const page = await fetchPage(url);
      const result = auditAccessibility(page);
      const lines = [
        `# Accessibility Audit: ${url}`,
        "",
        `**Score: ${result.grade} (${result.score}/100)**`,
        result.summary,
        "",
      ];
      for (const issue of result.issues) {
        const sev = issue.severity.toUpperCase();
        lines.push(`- **[${sev}]** ${issue.message}`);
        if (issue.wcag) lines.push(`  - WCAG: ${issue.wcag}`);
        if (issue.fix) lines.push(`  - Fix: ${issue.fix}`);
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Audit failed: ${msg}` }],
        isError: true,
      };
    }
  }
);

// === Tool: Performance Audit Only ===
server.tool(
  "audit_performance",
  "Analyze a page's performance: load time, page size, render-blocking resources, DOM complexity, compression, caching, and image optimization.",
  {
    url: z.string().describe("The URL to audit for performance"),
  },
  async ({ url }) => {
    try {
      const page = await fetchPage(url);
      const result = auditPerformance(page);
      const lines = [
        `# Performance Audit: ${url}`,
        "",
        `**Score: ${result.grade} (${result.score}/100)**`,
        result.summary,
        "",
      ];
      for (const issue of result.issues) {
        lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.message}`);
        if (issue.fix) lines.push(`  - Fix: ${issue.fix}`);
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Audit failed: ${msg}` }],
        isError: true,
      };
    }
  }
);

// === Tool: SEO Audit Only ===
server.tool(
  "audit_seo",
  "Check a page's SEO: title, meta description, headings, Open Graph, Twitter Cards, canonical URL, structured data, and more.",
  {
    url: z.string().describe("The URL to audit for SEO"),
  },
  async ({ url }) => {
    try {
      const page = await fetchPage(url);
      const result = auditSEO(page);
      const lines = [
        `# SEO Audit: ${url}`,
        "",
        `**Score: ${result.grade} (${result.score}/100)**`,
        result.summary,
        "",
      ];
      for (const issue of result.issues) {
        lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.message}`);
        if (issue.fix) lines.push(`  - Fix: ${issue.fix}`);
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Audit failed: ${msg}` }],
        isError: true,
      };
    }
  }
);

// === Tool: Compare Two Sites ===
server.tool(
  "compare_sites",
  "Compare two websites side by side across all audit categories. Useful for competitive analysis or before/after comparisons.",
  {
    url1: z.string().describe("First URL to compare"),
    url2: z.string().describe("Second URL to compare"),
  },
  async ({ url1, url2 }) => {
    try {
      const [result1, result2] = await Promise.all([
        runFullAudit(url1),
        runFullAudit(url2),
      ]);

      const lines = [
        `# Site Comparison`,
        "",
        `| Category | ${result1.url} | ${result2.url} |`,
        `|----------|------------|------------|`,
        `| **Overall** | **${result1.overallGrade} (${result1.overallScore})** | **${result2.overallGrade} (${result2.overallScore})** |`,
        `| Accessibility | ${result1.accessibility.grade} (${result1.accessibility.score}) | ${result2.accessibility.grade} (${result2.accessibility.score}) |`,
        `| Performance | ${result1.performance.grade} (${result1.performance.score}) | ${result2.performance.grade} (${result2.performance.score}) |`,
        `| SEO | ${result1.seo.grade} (${result1.seo.score}) | ${result2.seo.grade} (${result2.seo.score}) |`,
        `| Design | ${result1.design.grade} (${result1.design.score}) | ${result2.design.grade} (${result2.design.score}) |`,
        `| Mobile | ${result1.mobile.grade} (${result1.mobile.score}) | ${result2.mobile.grade} (${result2.mobile.score}) |`,
        `| EAA Status | ${result1.eaaCompliance.status} | ${result2.eaaCompliance.status} |`,
        "",
        `## Winner: ${result1.overallScore >= result2.overallScore ? result1.url : result2.url}`,
        "",
      ];

      // Show where each site wins
      const categories = [
        { name: "Accessibility", s1: result1.accessibility.score, s2: result2.accessibility.score },
        { name: "Performance", s1: result1.performance.score, s2: result2.performance.score },
        { name: "SEO", s1: result1.seo.score, s2: result2.seo.score },
        { name: "Design", s1: result1.design.score, s2: result2.design.score },
        { name: "Mobile", s1: result1.mobile.score, s2: result2.mobile.score },
      ];

      const site1Wins = categories.filter((c) => c.s1 > c.s2).map((c) => c.name);
      const site2Wins = categories.filter((c) => c.s2 > c.s1).map((c) => c.name);

      if (site1Wins.length > 0)
        lines.push(`**${result1.url}** wins in: ${site1Wins.join(", ")}`);
      if (site2Wins.length > 0)
        lines.push(`**${result2.url}** wins in: ${site2Wins.join(", ")}`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Comparison failed: ${msg}` }],
        isError: true,
      };
    }
  }
);

// === Start Server ===
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
