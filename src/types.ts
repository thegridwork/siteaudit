export interface AuditIssue {
  severity: "critical" | "major" | "minor" | "info";
  category: string;
  message: string;
  element?: string;
  fix?: string;
  wcag?: string; // WCAG criterion reference e.g. "1.1.1"
}

export interface CategoryScore {
  score: number; // 0-100
  grade: string; // A, B, C, D, F
  issues: AuditIssue[];
  summary: string;
}

export interface AuditResult {
  url: string;
  timestamp: string;
  overallScore: number;
  overallGrade: string;
  accessibility: CategoryScore;
  performance: CategoryScore;
  seo: CategoryScore;
  design: CategoryScore;
  mobile: CategoryScore;
  topPriorities: AuditIssue[];
  eaaCompliance: {
    status: "compliant" | "partial" | "non-compliant";
    summary: string;
  };
}

export interface PageData {
  url: string;
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  loadTimeMs: number;
  resourceCount: number;
  totalSizeBytes: number;
  title: string;
  meta: Record<string, string>;
  scripts: number;
  stylesheets: number;
  images: ImageData[];
  links: LinkData[];
  headings: HeadingData[];
  viewport?: string;
  lang?: string;
}

export interface ImageData {
  src: string;
  alt: string | null;
  width: string | null;
  height: string | null;
  loading: string | null;
}

export interface LinkData {
  href: string;
  text: string;
  isExternal: boolean;
  hasNofollow: boolean;
}

export interface HeadingData {
  level: number;
  text: string;
}
