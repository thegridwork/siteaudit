import * as cheerio from "cheerio";
import type { PageData, CategoryScore, AuditIssue } from "../types.js";

export function auditDesign(page: PageData): CategoryScore {
  const issues: AuditIssue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Font loading strategy
  const fontLinks = $('link[href*="fonts"]');
  const fontPreloads = $('link[rel="preload"][as="font"]');
  if (fontLinks.length > 0 && fontPreloads.length === 0) {
    issues.push({
      severity: "minor",
      category: "design",
      message: "Web fonts loaded without preload — may cause FOUT/FOIT",
      fix: "Add <link rel=\"preload\" as=\"font\" crossorigin> for critical fonts",
    });
  }

  // 2. Font count (too many = visual chaos)
  const fontFamilies = new Set<string>();
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const match = style.match(/font-family:\s*([^;]+)/);
    if (match) fontFamilies.add(match[1].trim().toLowerCase());
  });
  // Also check stylesheets embedded in page
  $("style").each((_, el) => {
    const css = $(el).text();
    const matches = css.matchAll(/font-family:\s*([^;}\n]+)/g);
    for (const match of matches) {
      fontFamilies.add(match[1].trim().toLowerCase());
    }
  });
  if (fontFamilies.size > 4) {
    issues.push({
      severity: "major",
      category: "design",
      message: `${fontFamilies.size} different font families detected — too many`,
      fix: "Limit to 2-3 font families for visual consistency",
    });
  }

  // 3. Color consistency (basic — check inline styles)
  const colors = new Set<string>();
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const colorMatches = style.matchAll(
      /(?:color|background-color|background):\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/g
    );
    for (const match of colorMatches) {
      colors.add(match[1].toLowerCase());
    }
  });
  if (colors.size > 12) {
    issues.push({
      severity: "minor",
      category: "design",
      message: `${colors.size} unique colors in inline styles — may indicate lack of design system`,
      fix: "Consolidate colors into a design system with CSS custom properties",
    });
  }

  // 4. Consistent spacing (check for many different margin/padding values)
  const spacingValues = new Set<string>();
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const spacingMatches = style.matchAll(
      /(?:margin|padding)(?:-(?:top|right|bottom|left))?:\s*([^;]+)/g
    );
    for (const match of spacingMatches) {
      spacingValues.add(match[1].trim());
    }
  });
  if (spacingValues.size > 15) {
    issues.push({
      severity: "minor",
      category: "design",
      message: `${spacingValues.size} unique spacing values — inconsistent spacing system`,
      fix: "Use a consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px, 64px)",
    });
  }

  // 5. Touch targets (buttons and links too small)
  // We can only check inline sizes, but it's a signal
  const smallButtons = $("button, a.button, a.btn, .btn, [role='button']").filter(
    (_, el) => {
      const style = $(el).attr("style") || "";
      const heightMatch = style.match(/height:\s*(\d+)px/);
      if (heightMatch && parseInt(heightMatch[1]) < 44) return true;
      const paddingMatch = style.match(/padding:\s*(\d+)px/);
      if (paddingMatch && parseInt(paddingMatch[1]) < 8) return true;
      return false;
    }
  );
  if (smallButtons.length > 0) {
    issues.push({
      severity: "major",
      category: "design",
      message: `${smallButtons.length} interactive elements may be too small for touch`,
      fix: "Ensure all interactive elements are at least 44x44px",
    });
  }

  // 6. Text readability — line length
  // Check for containers that might be too wide (no max-width)
  const wideContainers = $("p, article, .content, main").filter((_, el) => {
    const style = $(el).attr("style") || "";
    return (
      style.includes("width: 100%") &&
      !style.includes("max-width")
    );
  });
  if (wideContainers.length > 0) {
    issues.push({
      severity: "minor",
      category: "design",
      message: "Content containers without max-width — text lines may be too long",
      fix: "Set max-width on text containers (65-75 characters per line is optimal)",
    });
  }

  // 7. Visual hierarchy — check heading count
  if (page.headings.length === 0) {
    issues.push({
      severity: "major",
      category: "design",
      message: "No headings found — poor visual hierarchy",
      fix: "Use headings to create clear content hierarchy",
    });
  }

  // 8. CTA presence
  const ctaElements = $(
    "a.cta, a.button, button.cta, .cta, [class*='call-to-action'], a.btn-primary, button.btn-primary"
  );
  const hasCtaText = page.links.some(
    (l) =>
      /get started|sign up|try|buy|subscribe|contact|book|schedule/i.test(l.text)
  );
  if (ctaElements.length === 0 && !hasCtaText) {
    issues.push({
      severity: "info",
      category: "design",
      message: "No clear call-to-action detected",
      fix: "Add a prominent CTA if this is a landing or marketing page",
    });
  }

  // 9. Image aspect ratios / broken layout potential
  const imagesWithBothDimensions = page.images.filter(
    (img) => img.width && img.height
  );
  if (page.images.length > 0 && imagesWithBothDimensions.length === 0) {
    issues.push({
      severity: "major",
      category: "design",
      message: "No images have explicit dimensions — layout shift risk",
      fix: "Set width and height on images to prevent cumulative layout shift",
    });
  }

  // 10. Dark mode support
  $("style").each((_, el) => {
    const css = $(el).text();
    if (css.includes("prefers-color-scheme")) {
      // Has dark mode — good, no issue
      return;
    }
  });
  const hasDarkMode =
    $("style")
      .text()
      .includes("prefers-color-scheme") ||
    $('link[media*="prefers-color-scheme"]').length > 0 ||
    $("[class*='dark']").length > 0;

  if (!hasDarkMode) {
    issues.push({
      severity: "info",
      category: "design",
      message: "No dark mode support detected",
      fix: "Consider adding prefers-color-scheme media query support",
    });
  }

  // 11. Favicon and branding
  const hasFavicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0 ||
    $('link[rel="apple-touch-icon"]').length > 0;
  if (!hasFavicon) {
    issues.push({
      severity: "minor",
      category: "design",
      message: "No favicon detected — impacts brand recognition",
      fix: "Add favicon in multiple sizes including apple-touch-icon",
    });
  }

  // Score
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const majorCount = issues.filter((i) => i.severity === "major").length;
  const minorCount = issues.filter((i) => i.severity === "minor").length;

  const deductions = criticalCount * 15 + majorCount * 8 + minorCount * 3;
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return {
    score,
    grade: scoreToGrade(score),
    issues,
    summary: generateSummary(score),
  };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function generateSummary(score: number): string {
  if (score >= 90) return "Clean, consistent design with strong visual hierarchy.";
  if (score >= 70) return "Decent design with some inconsistencies to address.";
  return "Design needs improvement — inconsistent styling and missing best practices.";
}
