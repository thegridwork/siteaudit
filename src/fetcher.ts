import * as cheerio from "cheerio";
import type { PageData, ImageData, LinkData, HeadingData } from "./types.js";

export async function fetchPage(url: string): Promise<PageData> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  const start = Date.now();
  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent":
        "SiteAuditMCP/1.0 (accessibility and performance auditor)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });

  const html = await response.text();
  const loadTimeMs = Date.now() - start;

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const $ = cheerio.load(html);

  const meta: Record<string, string> = {};
  $("meta").each((_, el) => {
    const name =
      $(el).attr("name") || $(el).attr("property") || $(el).attr("http-equiv");
    const content = $(el).attr("content");
    if (name && content) meta[name] = content;
  });

  const images: ImageData[] = [];
  $("img").each((_, el) => {
    images.push({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt") ?? null,
      width: $(el).attr("width") ?? null,
      height: $(el).attr("height") ?? null,
      loading: $(el).attr("loading") ?? null,
    });
  });

  const links: LinkData[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    links.push({
      href,
      text: $(el).text().trim(),
      isExternal:
        href.startsWith("http") && !href.includes(new URL(normalizedUrl).host),
      hasNofollow: ($(el).attr("rel") || "").includes("nofollow"),
    });
  });

  const headings: HeadingData[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headings.push({
      level: parseInt(el.tagName.replace("h", "")),
      text: $(el).text().trim(),
    });
  });

  const sizeEstimate = new TextEncoder().encode(html).length;

  return {
    url: normalizedUrl,
    html,
    statusCode: response.status,
    headers,
    loadTimeMs,
    resourceCount:
      images.length + $("script[src]").length + $('link[rel="stylesheet"]').length,
    totalSizeBytes: sizeEstimate,
    title: $("title").text().trim(),
    meta,
    scripts: $("script").length,
    stylesheets: $('link[rel="stylesheet"]').length + $("style").length,
    images,
    links,
    headings,
    viewport: $('meta[name="viewport"]').attr("content") ?? undefined,
    lang: $("html").attr("lang") ?? undefined,
  };
}
