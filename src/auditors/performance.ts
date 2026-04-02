import * as cheerio from "cheerio";
import type { PageData, CategoryScore, AuditIssue } from "../types.js";

export function auditPerformance(page: PageData): CategoryScore {
  const issues: AuditIssue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Page load time
  if (page.loadTimeMs > 5000) {
    issues.push({
      severity: "critical",
      category: "performance",
      message: `Page took ${(page.loadTimeMs / 1000).toFixed(1)}s to load (server response)`,
      fix: "Investigate server response time, caching, and CDN usage",
    });
  } else if (page.loadTimeMs > 3000) {
    issues.push({
      severity: "major",
      category: "performance",
      message: `Page took ${(page.loadTimeMs / 1000).toFixed(1)}s to load`,
      fix: "Consider server-side caching or CDN",
    });
  } else if (page.loadTimeMs > 1500) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: `Page load time is ${page.loadTimeMs}ms — room for improvement`,
      fix: "Optimize server response time",
    });
  }

  // 2. Page size
  const sizeKB = page.totalSizeBytes / 1024;
  const sizeMB = sizeKB / 1024;
  if (sizeMB > 3) {
    issues.push({
      severity: "critical",
      category: "performance",
      message: `HTML document is ${sizeMB.toFixed(1)}MB — extremely large`,
      fix: "Reduce HTML size by removing inline assets, excessive DOM nodes, or unused markup",
    });
  } else if (sizeMB > 1) {
    issues.push({
      severity: "major",
      category: "performance",
      message: `HTML document is ${sizeMB.toFixed(1)}MB`,
      fix: "Consider lazy loading content and reducing DOM size",
    });
  } else if (sizeKB > 200) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: `HTML document is ${sizeKB.toFixed(0)}KB`,
      fix: "Review for unnecessary markup or inline styles/scripts",
    });
  }

  // 3. Script count and render blocking
  const renderBlockingScripts = $("head script:not([async]):not([defer]):not([type='application/ld+json'])");
  if (renderBlockingScripts.length > 0) {
    issues.push({
      severity: "major",
      category: "performance",
      message: `${renderBlockingScripts.length} render-blocking script(s) in <head>`,
      fix: "Add async or defer attribute to non-critical scripts",
    });
  }

  if (page.scripts > 15) {
    issues.push({
      severity: "major",
      category: "performance",
      message: `${page.scripts} script elements found — consider bundling`,
      fix: "Bundle scripts to reduce HTTP requests",
    });
  }

  // 4. Stylesheet count
  if (page.stylesheets > 8) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: `${page.stylesheets} stylesheet references found`,
      fix: "Consolidate CSS files to reduce requests",
    });
  }

  // 5. Image optimization
  const imagesWithoutDimensions = page.images.filter(
    (img) => !img.width || !img.height
  );
  if (imagesWithoutDimensions.length > 0) {
    issues.push({
      severity: "major",
      category: "performance",
      message: `${imagesWithoutDimensions.length} image(s) missing width/height attributes — causes layout shift`,
      fix: "Add explicit width and height attributes to all images",
    });
  }

  const imagesWithoutLazyLoad = page.images.filter(
    (img) => img.loading !== "lazy"
  );
  // Only flag if there are many images and most aren't lazy loaded
  if (page.images.length > 3 && imagesWithoutLazyLoad.length > page.images.length * 0.5) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: `${imagesWithoutLazyLoad.length}/${page.images.length} images not using lazy loading`,
      fix: 'Add loading="lazy" to below-the-fold images',
    });
  }

  // 6. Compression headers
  const encoding = page.headers["content-encoding"];
  if (!encoding || (!encoding.includes("gzip") && !encoding.includes("br"))) {
    issues.push({
      severity: "major",
      category: "performance",
      message: "No gzip/brotli compression detected",
      fix: "Enable gzip or brotli compression on the server",
    });
  }

  // 7. Caching headers
  const cacheControl = page.headers["cache-control"];
  if (!cacheControl) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: "No Cache-Control header set",
      fix: "Add appropriate Cache-Control headers for static assets",
    });
  }

  // 8. Inline styles (performance + maintainability)
  const inlineStyles = $("[style]").length;
  if (inlineStyles > 20) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: `${inlineStyles} elements with inline styles — increases HTML size`,
      fix: "Move inline styles to CSS classes",
    });
  }

  // 9. DOM size
  const domNodes = $("*").length;
  if (domNodes > 3000) {
    issues.push({
      severity: "critical",
      category: "performance",
      message: `Excessive DOM size: ${domNodes} nodes (recommended < 1,500)`,
      fix: "Reduce DOM complexity with virtualization or lazy rendering",
    });
  } else if (domNodes > 1500) {
    issues.push({
      severity: "major",
      category: "performance",
      message: `Large DOM: ${domNodes} nodes`,
      fix: "Consider simplifying page structure",
    });
  }

  // 10. Preconnect/prefetch hints
  const hasPreconnect = $('link[rel="preconnect"]').length > 0;
  const hasDnsPrefetch = $('link[rel="dns-prefetch"]').length > 0;
  const externalScripts = $("script[src]").filter((_, el) => {
    const src = $(el).attr("src") || "";
    return src.startsWith("http");
  });
  if (externalScripts.length > 2 && !hasPreconnect && !hasDnsPrefetch) {
    issues.push({
      severity: "minor",
      category: "performance",
      message: `${externalScripts.length} external scripts without preconnect hints`,
      fix: "Add <link rel=\"preconnect\"> for third-party domains",
    });
  }

  // 11. HTTP/2 push / preload
  const hasPreload = $('link[rel="preload"]').length > 0;
  if (!hasPreload && page.resourceCount > 10) {
    issues.push({
      severity: "info",
      category: "performance",
      message: "No resource preloading detected",
      fix: "Preload critical assets (fonts, hero images) with <link rel=\"preload\">",
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
    summary: generateSummary(score, page),
  };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function generateSummary(score: number, page: PageData): string {
  const loadSec = (page.loadTimeMs / 1000).toFixed(1);
  const sizeKB = (page.totalSizeBytes / 1024).toFixed(0);
  if (score >= 90)
    return `Fast site. ${loadSec}s load, ${sizeKB}KB HTML, well-optimized.`;
  if (score >= 70)
    return `Decent performance (${loadSec}s load, ${sizeKB}KB). Some optimization opportunities.`;
  return `Performance needs work. ${loadSec}s load time, ${sizeKB}KB HTML. Multiple optimization opportunities identified.`;
}
