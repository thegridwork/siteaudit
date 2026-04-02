import * as cheerio from "cheerio";
import type { PageData, CategoryScore, AuditIssue } from "../types.js";

export function auditAccessibility(page: PageData): CategoryScore {
  const issues: AuditIssue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Language attribute (WCAG 3.1.1)
  if (!page.lang) {
    issues.push({
      severity: "critical",
      category: "accessibility",
      message: "Missing lang attribute on <html> element",
      fix: 'Add lang="en" (or appropriate language) to the <html> tag',
      wcag: "3.1.1",
    });
  }

  // 2. Image alt text (WCAG 1.1.1)
  const imagesWithoutAlt = page.images.filter((img) => img.alt === null);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      severity: "critical",
      category: "accessibility",
      message: `${imagesWithoutAlt.length} image(s) missing alt attribute`,
      element: imagesWithoutAlt
        .slice(0, 3)
        .map((i) => i.src)
        .join(", "),
      fix: "Add descriptive alt text to all images, or alt=\"\" for decorative images",
      wcag: "1.1.1",
    });
  }

  // 3. Empty alt on non-decorative images
  const emptyAltImages = page.images.filter(
    (img) => img.alt === "" && !img.src.includes("icon") && !img.src.includes("decorative")
  );
  if (emptyAltImages.length > 3) {
    issues.push({
      severity: "minor",
      category: "accessibility",
      message: `${emptyAltImages.length} images have empty alt text — verify they are truly decorative`,
      wcag: "1.1.1",
    });
  }

  // 4. Form labels (WCAG 1.3.1, 4.1.2)
  const inputs = $("input, select, textarea").not('[type="hidden"], [type="submit"], [type="button"]');
  let unlabeledInputs = 0;
  inputs.each((_, el) => {
    const id = $(el).attr("id");
    const ariaLabel = $(el).attr("aria-label");
    const ariaLabelledBy = $(el).attr("aria-labelledby");
    const title = $(el).attr("title");
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const wrappedInLabel = $(el).closest("label").length > 0;

    if (!hasLabel && !wrappedInLabel && !ariaLabel && !ariaLabelledBy && !title) {
      unlabeledInputs++;
    }
  });
  if (unlabeledInputs > 0) {
    issues.push({
      severity: "critical",
      category: "accessibility",
      message: `${unlabeledInputs} form input(s) without associated labels`,
      fix: "Add <label for=\"id\"> or aria-label to all form inputs",
      wcag: "4.1.2",
    });
  }

  // 5. Heading hierarchy (WCAG 1.3.1)
  const headingLevels = page.headings.map((h) => h.level);
  if (headingLevels.length > 0 && headingLevels[0] !== 1) {
    issues.push({
      severity: "major",
      category: "accessibility",
      message: `Page does not start with an <h1> — first heading is <h${headingLevels[0]}>`,
      fix: "Ensure the page has an <h1> as the first heading",
      wcag: "1.3.1",
    });
  }

  // Check for skipped heading levels
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      issues.push({
        severity: "major",
        category: "accessibility",
        message: `Heading level skipped: <h${headingLevels[i - 1]}> → <h${headingLevels[i]}>`,
        fix: "Use sequential heading levels without skipping",
        wcag: "1.3.1",
      });
      break;
    }
  }

  // 6. Multiple H1s
  const h1Count = headingLevels.filter((l) => l === 1).length;
  if (h1Count > 1) {
    issues.push({
      severity: "minor",
      category: "accessibility",
      message: `Page has ${h1Count} <h1> elements — typically should have one`,
      fix: "Use a single <h1> for the main page title",
      wcag: "1.3.1",
    });
  }

  // 7. Link text quality (WCAG 2.4.4)
  const vagueLinkTexts = ["click here", "read more", "learn more", "here", "link", "more"];
  const vagueLinks = page.links.filter((l) =>
    vagueLinkTexts.includes(l.text.toLowerCase())
  );
  if (vagueLinks.length > 0) {
    issues.push({
      severity: "major",
      category: "accessibility",
      message: `${vagueLinks.length} link(s) with vague text (e.g., "${vagueLinks[0].text}")`,
      fix: "Use descriptive link text that makes sense out of context",
      wcag: "2.4.4",
    });
  }

  // 8. Empty links
  const emptyLinks = page.links.filter((l) => !l.text.trim());
  if (emptyLinks.length > 0) {
    issues.push({
      severity: "critical",
      category: "accessibility",
      message: `${emptyLinks.length} link(s) with no text content`,
      fix: "Add text or aria-label to all links",
      wcag: "4.1.2",
    });
  }

  // 9. Color contrast (basic check — inline styles)
  const smallText = $("[style]").filter((_, el) => {
    const style = $(el).attr("style") || "";
    return style.includes("color") && style.includes("font-size");
  });
  if (smallText.length > 0) {
    issues.push({
      severity: "info",
      category: "accessibility",
      message: "Inline styles with color detected — manual contrast check recommended",
      fix: "Ensure all text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)",
      wcag: "1.4.3",
    });
  }

  // 10. ARIA landmark roles
  const hasMain = $("main, [role='main']").length > 0;
  const hasNav = $("nav, [role='navigation']").length > 0;
  if (!hasMain) {
    issues.push({
      severity: "major",
      category: "accessibility",
      message: "No <main> landmark found",
      fix: "Wrap primary content in a <main> element",
      wcag: "1.3.1",
    });
  }
  if (!hasNav) {
    issues.push({
      severity: "minor",
      category: "accessibility",
      message: "No <nav> landmark found",
      fix: "Wrap navigation in a <nav> element",
      wcag: "1.3.1",
    });
  }

  // 11. Skip navigation link (WCAG 2.4.1)
  const firstLink = $("a").first();
  const hasSkipLink =
    firstLink.attr("href")?.startsWith("#") &&
    (firstLink.text().toLowerCase().includes("skip") ||
      firstLink.attr("class")?.includes("skip"));
  if (!hasSkipLink) {
    issues.push({
      severity: "minor",
      category: "accessibility",
      message: "No skip navigation link found",
      fix: 'Add a "Skip to main content" link as the first focusable element',
      wcag: "2.4.1",
    });
  }

  // 12. Tab index misuse
  const positiveTabindex = $("[tabindex]").filter((_, el) => {
    const val = parseInt($(el).attr("tabindex") || "0");
    return val > 0;
  });
  if (positiveTabindex.length > 0) {
    issues.push({
      severity: "major",
      category: "accessibility",
      message: `${positiveTabindex.length} element(s) with positive tabindex — disrupts natural tab order`,
      fix: "Use tabindex=\"0\" or tabindex=\"-1\" instead of positive values",
      wcag: "2.4.3",
    });
  }

  // 13. Auto-playing media
  const autoplayMedia = $("video[autoplay], audio[autoplay]");
  if (autoplayMedia.length > 0) {
    issues.push({
      severity: "critical",
      category: "accessibility",
      message: `${autoplayMedia.length} auto-playing media element(s) detected`,
      fix: "Remove autoplay or provide controls to pause/stop",
      wcag: "1.4.2",
    });
  }

  // 14. Document title
  if (!page.title) {
    issues.push({
      severity: "critical",
      category: "accessibility",
      message: "Page has no <title> element",
      fix: "Add a descriptive <title> to the page",
      wcag: "2.4.2",
    });
  }

  // Score calculation
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const majorCount = issues.filter((i) => i.severity === "major").length;
  const minorCount = issues.filter((i) => i.severity === "minor").length;

  const deductions = criticalCount * 15 + majorCount * 8 + minorCount * 3;
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return {
    score,
    grade: scoreToGrade(score),
    issues,
    summary: generateSummary(score, issues),
  };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function generateSummary(score: number, issues: AuditIssue[]): string {
  const critical = issues.filter((i) => i.severity === "critical").length;
  const major = issues.filter((i) => i.severity === "major").length;

  if (score >= 90) return `Excellent accessibility. ${issues.length} minor issues found.`;
  if (score >= 70)
    return `Good accessibility with room for improvement. ${critical} critical and ${major} major issues need attention.`;
  return `Significant accessibility problems detected. ${critical} critical and ${major} major issues must be fixed for WCAG 2.1 AA / EAA compliance.`;
}
