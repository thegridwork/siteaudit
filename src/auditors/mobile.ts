import * as cheerio from "cheerio";
import type { PageData, CategoryScore, AuditIssue } from "../types.js";

export function auditMobile(page: PageData): CategoryScore {
  const issues: AuditIssue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Viewport meta tag
  if (!page.viewport) {
    issues.push({
      severity: "critical",
      category: "mobile",
      message: "Missing viewport meta tag",
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    });
  } else {
    if (!page.viewport.includes("width=device-width")) {
      issues.push({
        severity: "critical",
        category: "mobile",
        message: `Viewport not set to device width: "${page.viewport}"`,
        fix: "Set width=device-width in viewport meta",
      });
    }
    if (page.viewport.includes("maximum-scale=1") || page.viewport.includes("user-scalable=no")) {
      issues.push({
        severity: "critical",
        category: "mobile",
        message: "Viewport disables zoom — accessibility violation",
        fix: "Remove maximum-scale=1 and user-scalable=no to allow pinch-to-zoom",
      });
    }
  }

  // 2. Touch target sizes
  const tinyLinks = page.links.filter((l) => l.text.length === 1);
  if (tinyLinks.length > 0) {
    issues.push({
      severity: "minor",
      category: "mobile",
      message: `${tinyLinks.length} link(s) with single-character text — likely too small to tap`,
      fix: "Ensure touch targets are at least 44x44px with adequate spacing",
    });
  }

  // 3. Fixed-width elements
  const fixedWidthElements = $("[style]").filter((_, el) => {
    const style = $(el).attr("style") || "";
    const widthMatch = style.match(/width:\s*(\d+)px/);
    return !!(widthMatch && parseInt(widthMatch[1]) > 400);
  });
  if (fixedWidthElements.length > 0) {
    issues.push({
      severity: "major",
      category: "mobile",
      message: `${fixedWidthElements.length} element(s) with fixed width > 400px — will overflow on mobile`,
      fix: "Use max-width or percentage-based widths instead of fixed pixel widths",
    });
  }

  // 4. Horizontal scrolling indicators
  const hasOverflowX = $("[style*='overflow-x: scroll'], [style*='overflow-x:scroll']").length;
  const wideElements = $("table, pre, iframe").length;
  if (wideElements > 0) {
    issues.push({
      severity: "minor",
      category: "mobile",
      message: `${wideElements} potentially overflow-prone element(s) (table, pre, iframe)`,
      fix: "Wrap tables in overflow-x: auto containers, make iframes responsive",
    });
  }

  // 5. Responsive images
  const responsiveImages = page.images.filter(
    (img) => $(`img[src="${img.src}"]`).attr("srcset") !== undefined
  );
  if (page.images.length > 3 && responsiveImages.length === 0) {
    issues.push({
      severity: "major",
      category: "mobile",
      message: "No responsive images (srcset) detected",
      fix: "Use srcset and sizes attributes to serve appropriately sized images",
    });
  }

  // 6. Media queries in inline styles
  // Can't detect CSS file media queries without fetching them, but check <style>
  let hasResponsiveCSS = false;
  $("style").each((_, el) => {
    if ($(el).text().includes("@media")) {
      hasResponsiveCSS = true;
    }
  });
  const hasResponsiveLink = $('link[media]').filter((_, el) => {
    const media = $(el).attr("media") || "";
    return media.includes("max-width") || media.includes("min-width");
  }).length > 0;

  if (!hasResponsiveCSS && !hasResponsiveLink) {
    issues.push({
      severity: "info",
      category: "mobile",
      message: "No responsive media queries detected in inline styles",
      fix: "Verify responsive breakpoints exist in external CSS files",
    });
  }

  // 7. Text size
  const tinyText = $("[style]").filter((_, el) => {
    const style = $(el).attr("style") || "";
    const sizeMatch = style.match(/font-size:\s*(\d+)px/);
    return !!(sizeMatch && parseInt(sizeMatch[1]) < 14);
  });
  if (tinyText.length > 5) {
    issues.push({
      severity: "major",
      category: "mobile",
      message: `${tinyText.length} elements with font-size < 14px — hard to read on mobile`,
      fix: "Use minimum 16px base font size for mobile readability",
    });
  }

  // 8. Input types for mobile keyboards
  const genericInputs = $("input[type='text']").filter((_, el) => {
    const name = ($(el).attr("name") || "").toLowerCase();
    const placeholder = ($(el).attr("placeholder") || "").toLowerCase();
    return (
      name.includes("email") ||
      name.includes("phone") ||
      name.includes("tel") ||
      name.includes("url") ||
      placeholder.includes("email") ||
      placeholder.includes("phone")
    );
  });
  if (genericInputs.length > 0) {
    issues.push({
      severity: "minor",
      category: "mobile",
      message: `${genericInputs.length} input(s) could use specific input types for better mobile keyboards`,
      fix: 'Use type="email", type="tel", type="url" for appropriate inputs',
    });
  }

  // 9. Tap delay
  const hasTouchAction = $("[style*='touch-action']").length > 0;
  // Modern browsers don't need this if viewport is set, but older apps might
  // This is informational only

  // 10. Apple mobile web app capable
  const hasAppleMeta =
    $('meta[name="apple-mobile-web-app-capable"]').length > 0;
  const hasThemeColor = $('meta[name="theme-color"]').length > 0;
  if (!hasThemeColor) {
    issues.push({
      severity: "info",
      category: "mobile",
      message: "No theme-color meta tag — browser chrome won't match site branding",
      fix: 'Add <meta name="theme-color" content="#yourcolor">',
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
  if (score >= 90) return "Well-optimized for mobile devices.";
  if (score >= 70) return "Mostly mobile-friendly with some improvements needed.";
  return "Significant mobile usability issues detected.";
}
