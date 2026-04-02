import * as cheerio from "cheerio";
import type { PageData, CategoryScore, AuditIssue } from "../types.js";

export function auditSEO(page: PageData): CategoryScore {
  const issues: AuditIssue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Title tag
  if (!page.title) {
    issues.push({
      severity: "critical",
      category: "seo",
      message: "Missing <title> tag",
      fix: "Add a unique, descriptive title (50-60 characters)",
    });
  } else if (page.title.length < 10) {
    issues.push({
      severity: "major",
      category: "seo",
      message: `Title too short: "${page.title}" (${page.title.length} chars)`,
      fix: "Use 50-60 characters for optimal search display",
    });
  } else if (page.title.length > 60) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: `Title may be truncated in search: ${page.title.length} chars`,
      fix: "Keep title under 60 characters",
    });
  }

  // 2. Meta description
  const metaDesc = page.meta["description"];
  if (!metaDesc) {
    issues.push({
      severity: "critical",
      category: "seo",
      message: "Missing meta description",
      fix: "Add a compelling meta description (150-160 characters)",
    });
  } else if (metaDesc.length < 50) {
    issues.push({
      severity: "major",
      category: "seo",
      message: `Meta description too short (${metaDesc.length} chars)`,
      fix: "Use 150-160 characters for optimal search display",
    });
  } else if (metaDesc.length > 160) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: `Meta description may be truncated: ${metaDesc.length} chars`,
      fix: "Keep meta description under 160 characters",
    });
  }

  // 3. H1 tag
  const h1s = page.headings.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    issues.push({
      severity: "critical",
      category: "seo",
      message: "No <h1> heading found",
      fix: "Add a single <h1> that describes the page content",
    });
  } else if (h1s.length > 1) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: `Multiple <h1> tags found (${h1s.length})`,
      fix: "Use a single <h1> per page",
    });
  }

  // 4. Open Graph tags
  const ogTitle = page.meta["og:title"];
  const ogDesc = page.meta["og:description"];
  const ogImage = page.meta["og:image"];
  const ogType = page.meta["og:type"];

  const missingOg = [];
  if (!ogTitle) missingOg.push("og:title");
  if (!ogDesc) missingOg.push("og:description");
  if (!ogImage) missingOg.push("og:image");
  if (!ogType) missingOg.push("og:type");

  if (missingOg.length > 0) {
    issues.push({
      severity: missingOg.length >= 3 ? "major" : "minor",
      category: "seo",
      message: `Missing Open Graph tags: ${missingOg.join(", ")}`,
      fix: "Add Open Graph meta tags for better social media sharing",
    });
  }

  // 5. Twitter Card
  const twitterCard = page.meta["twitter:card"];
  if (!twitterCard) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: "Missing Twitter Card meta tags",
      fix: 'Add <meta name="twitter:card" content="summary_large_image">',
    });
  }

  // 6. Canonical URL
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    issues.push({
      severity: "major",
      category: "seo",
      message: "No canonical URL specified",
      fix: "Add <link rel=\"canonical\" href=\"...\"> to prevent duplicate content",
    });
  }

  // 7. Structured data
  const jsonLd = $('script[type="application/ld+json"]');
  if (jsonLd.length === 0) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: "No structured data (JSON-LD) found",
      fix: "Add schema.org structured data for rich search results",
    });
  }

  // 8. Image alt text (SEO perspective)
  const imagesWithoutAlt = page.images.filter((img) => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: `${imagesWithoutAlt.length} image(s) without alt text — missed keyword opportunity`,
      fix: "Add descriptive alt text with relevant keywords",
    });
  }

  // 9. Internal linking
  const internalLinks = page.links.filter((l) => !l.isExternal);
  if (internalLinks.length < 3) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: `Only ${internalLinks.length} internal links found`,
      fix: "Add more internal links to improve site crawlability",
    });
  }

  // 10. Robots meta
  const robotsMeta = page.meta["robots"];
  if (robotsMeta && (robotsMeta.includes("noindex") || robotsMeta.includes("nofollow"))) {
    issues.push({
      severity: "info",
      category: "seo",
      message: `Robots meta: "${robotsMeta}" — page may not be indexed`,
      fix: "Remove noindex/nofollow if this page should appear in search",
    });
  }

  // 11. HTTPS
  if (page.url.startsWith("http://")) {
    issues.push({
      severity: "critical",
      category: "seo",
      message: "Site not using HTTPS",
      fix: "Enable HTTPS — it's a ranking factor and required for security",
    });
  }

  // 12. Favicon
  const hasFavicon =
    $('link[rel="icon"]').length > 0 || $('link[rel="shortcut icon"]').length > 0;
  if (!hasFavicon) {
    issues.push({
      severity: "minor",
      category: "seo",
      message: "No favicon detected",
      fix: "Add a favicon for better brand recognition in tabs and bookmarks",
    });
  }

  // 13. Sitemap reference
  // We can't check if sitemap exists without another fetch, but we can note it
  issues.push({
    severity: "info",
    category: "seo",
    message: "Verify sitemap.xml and robots.txt exist at site root",
    fix: "Ensure /sitemap.xml and /robots.txt are accessible",
  });

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
  if (score >= 90) return "Strong SEO foundation. Minor improvements possible.";
  if (score >= 70)
    return `Decent SEO with ${critical} critical issue(s) to address.`;
  return `SEO needs significant work. ${critical} critical issues blocking search visibility.`;
}
