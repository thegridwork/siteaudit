import { fetchPage } from "./fetcher.js";
import { auditAccessibility } from "./auditors/accessibility.js";
import { auditPerformance } from "./auditors/performance.js";
import { auditSEO } from "./auditors/seo.js";
import { auditDesign } from "./auditors/design.js";
import { auditMobile } from "./auditors/mobile.js";
import type { AuditResult, AuditIssue } from "./types.js";

export async function runFullAudit(url: string): Promise<AuditResult> {
  const page = await fetchPage(url);

  const accessibility = auditAccessibility(page);
  const performance = auditPerformance(page);
  const seo = auditSEO(page);
  const design = auditDesign(page);
  const mobile = auditMobile(page);

  // Weighted overall score
  const overallScore = Math.round(
    accessibility.score * 0.30 +
    performance.score * 0.20 +
    seo.score * 0.20 +
    design.score * 0.15 +
    mobile.score * 0.15
  );

  // Collect top priorities — critical first, then major
  const allIssues: AuditIssue[] = [
    ...accessibility.issues,
    ...performance.issues,
    ...seo.issues,
    ...design.issues,
    ...mobile.issues,
  ];

  const topPriorities = allIssues
    .filter((i) => i.severity === "critical" || i.severity === "major")
    .sort((a, b) => {
      const order = { critical: 0, major: 1, minor: 2, info: 3 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 10);

  // EAA compliance assessment
  const accessibilityCritical = accessibility.issues.filter(
    (i) => i.severity === "critical"
  ).length;
  const eaaStatus =
    accessibilityCritical === 0 && accessibility.score >= 80
      ? "compliant"
      : accessibilityCritical <= 2 && accessibility.score >= 60
        ? "partial"
        : "non-compliant";

  const eaaSummary =
    eaaStatus === "compliant"
      ? "Site appears to meet EAA/WCAG 2.1 AA baseline requirements. Professional audit recommended for full certification."
      : eaaStatus === "partial"
        ? `Site partially meets EAA requirements. ${accessibilityCritical} critical accessibility issue(s) must be resolved before the EU enforcement deadline.`
        : `Site does not meet EAA/WCAG 2.1 AA requirements. ${accessibilityCritical} critical issues detected. Immediate remediation needed — EU enforcement is active since June 2025.`;

  return {
    url: page.url,
    timestamp: new Date().toISOString(),
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    accessibility,
    performance,
    seo,
    design,
    mobile,
    topPriorities,
    eaaCompliance: {
      status: eaaStatus,
      summary: eaaSummary,
    },
  };
}

export function formatAuditReport(result: AuditResult): string {
  const lines: string[] = [];

  lines.push(`# Site Audit Report: ${result.url}`);
  lines.push(`*Generated: ${result.timestamp}*`);
  lines.push("");
  lines.push(`## Overall: ${result.overallGrade} (${result.overallScore}/100)`);
  lines.push("");

  // Category scores
  lines.push("## Scores by Category");
  lines.push("");
  lines.push(`| Category | Score | Grade |`);
  lines.push(`|----------|-------|-------|`);
  lines.push(
    `| Accessibility (30%) | ${result.accessibility.score}/100 | ${result.accessibility.grade} |`
  );
  lines.push(
    `| Performance (20%) | ${result.performance.score}/100 | ${result.performance.grade} |`
  );
  lines.push(`| SEO (20%) | ${result.seo.score}/100 | ${result.seo.grade} |`);
  lines.push(
    `| Design (15%) | ${result.design.score}/100 | ${result.design.grade} |`
  );
  lines.push(
    `| Mobile (15%) | ${result.mobile.score}/100 | ${result.mobile.grade} |`
  );
  lines.push("");

  // EAA Compliance
  lines.push("## EAA/WCAG Compliance");
  const statusEmoji =
    result.eaaCompliance.status === "compliant"
      ? "PASS"
      : result.eaaCompliance.status === "partial"
        ? "PARTIAL"
        : "FAIL";
  lines.push(`**Status: ${statusEmoji}**`);
  lines.push(result.eaaCompliance.summary);
  lines.push("");

  // Top priorities
  if (result.topPriorities.length > 0) {
    lines.push("## Top Priority Fixes");
    lines.push("");
    result.topPriorities.forEach((issue, i) => {
      const severity = issue.severity.toUpperCase();
      lines.push(
        `${i + 1}. **[${severity}]** ${issue.message}`
      );
      if (issue.fix) lines.push(`   Fix: ${issue.fix}`);
      if (issue.wcag) lines.push(`   WCAG: ${issue.wcag}`);
    });
    lines.push("");
  }

  // Detailed sections
  const sections = [
    { name: "Accessibility", data: result.accessibility },
    { name: "Performance", data: result.performance },
    { name: "SEO", data: result.seo },
    { name: "Design Quality", data: result.design },
    { name: "Mobile Responsiveness", data: result.mobile },
  ];

  for (const section of sections) {
    lines.push(`## ${section.name} — ${section.data.grade} (${section.data.score}/100)`);
    lines.push(section.data.summary);
    lines.push("");
    if (section.data.issues.length > 0) {
      for (const issue of section.data.issues) {
        const sev = issue.severity === "critical" ? "CRITICAL" :
                    issue.severity === "major" ? "MAJOR" :
                    issue.severity === "minor" ? "MINOR" : "INFO";
        lines.push(`- **[${sev}]** ${issue.message}`);
        if (issue.fix) lines.push(`  - Fix: ${issue.fix}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}
