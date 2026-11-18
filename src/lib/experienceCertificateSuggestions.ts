/**
 * Role-based Experience Certificate suggestion packs.
 *
 * Why: HR certificates follow CODO sample structure (technologies by category +
 * key responsibilities). Catalog fills instantly; Gemini can refine when configured.
 */

export type CertificateSuggestionPack = {
  key: string;
  label: string;
  match: string[];
  technologies: string[];
  responsibilities: string[];
  assessment: string;
};

export const CERTIFICATE_ROLE_PACKS: CertificateSuggestionPack[] = [
  {
    key: "frontend",
    label: "Frontend Developer",
    match: [
      "frontend",
      "front end",
      "front-end",
      "react",
      "ui developer",
      "web developer",
    ],
    technologies: [
      "Frontend Development: React.js, Next.js, JavaScript (ES6+), TypeScript, HTML5, CSS3, Tailwind CSS, Material UI (MUI), Shadcn UI",
      "State Management: Redux Toolkit, Context API, TanStack Query (React Query)",
      "API Integration: REST APIs, Axios, Fetch API, JWT Authentication",
      "Forms & Validation: React Hook Form, Zod",
      "Development Tools: Git, GitHub, Postman, npm",
    ],
    responsibilities: [
      "Engineered dynamic and user-centric interfaces with modern React patterns and responsive layouts.",
      "Integrated frontend applications with backend services and REST APIs.",
      "Implemented forms, validation, and authenticated flows based on product requirements.",
      "Collaborated effectively with cross-functional teams to deliver production-ready features.",
      "Contributed to application updates, code reviews, and deployment readiness.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated strong technical expertise and professionalism in building responsive, user-centric web applications.",
  },
  {
    key: "fullstack",
    label: "Full Stack Developer",
    match: ["full stack", "fullstack", "full-stack"],
    technologies: [
      "Frontend Development: React, Next.js, TypeScript, CSS, Tailwind CSS",
      "Backend & APIs: Node.js / PHP, REST APIs, authentication flows",
      "Database: MySQL / relational data modeling, CRUD operations",
      "Development Tools: Git, GitHub, Postman, npm",
    ],
    responsibilities: [
      "Developed responsive and user-friendly web interfaces using React, Next.js, TypeScript, CSS and Tailwind CSS.",
      "Integrated frontend applications with backend services and APIs.",
      "Implemented CRUD operations and database integration based on project requirements.",
      "Contributed to application updates and deployment.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated strong technical expertise and played a key role in designing and developing responsive web applications.",
  },
  {
    key: "backend",
    label: "Backend Developer",
    match: ["backend", "back end", "back-end", "api developer", "php developer", "node"],
    technologies: [
      "Backend Development: PHP / Node.js, REST APIs, authentication & authorization",
      "Database: MySQL, query optimization, migrations",
      "Integrations: third-party APIs, webhooks, file storage",
      "Development Tools: Git, GitHub, Postman, cURL",
    ],
    responsibilities: [
      "Designed and implemented reliable backend APIs and business logic.",
      "Built authentication, authorization, and data-access layers for production apps.",
      "Optimized database queries and maintained migration safety.",
      "Collaborated with frontend teams to deliver end-to-end features.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated strong backend engineering skills and reliable ownership of API and data layers.",
  },
  {
    key: "creative",
    label: "Creative Designer",
    match: [
      "creative",
      "designer",
      "ui/ux",
      "ui ux",
      "graphic",
      "design",
      "creator",
    ],
    technologies: [
      "Design Tools: Figma, Adobe Illustrator, Photoshop, Canva",
      "UI Systems: design systems, component libraries, brand kits",
      "Motion & Export: WebP/PNG export, social formats, print layouts",
      "Collaboration: Notion / briefs, feedback cycles, versioned assets",
    ],
    responsibilities: [
      "Created brand-consistent visual designs for digital products and campaigns.",
      "Produced UI mockups, posters, and marketing creatives aligned with CODO guidelines.",
      "Collaborated with product and development teams to refine user experience.",
      "Maintained organized asset libraries and export-ready deliverables.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated creativity, attention to detail, and strong ownership of brand-quality visual deliverables.",
  },
  {
    key: "tester",
    label: "QA / Tester",
    match: ["tester", "qa", "quality", "test engineer", "sdet"],
    technologies: [
      "Testing: manual QA, exploratory testing, regression suites",
      "Tracking: BugRicer / issue workflows, retests, evidence capture",
      "API Checks: Postman, status codes, contract validation",
      "Browsers & Devices: Chrome, Safari, responsive and cross-browser checks",
    ],
    responsibilities: [
      "Executed functional, regression, and exploratory test cycles across releases.",
      "Logged clear defect reports with reproduction steps and evidence.",
      "Verified fixes through retests and prevented regressions on critical flows.",
      "Collaborated with developers to improve product quality and release readiness.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated thorough testing discipline and a strong commitment to product quality.",
  },
  {
    key: "data_science",
    label: "Data Science / AI",
    match: [
      "data science",
      "data scientist",
      "machine learning",
      "ml engineer",
      "ai intern",
      "nlp",
    ],
    technologies: [
      "Programming: Python, Java, JavaScript",
      "Data Analysis & Visualization: Pandas, NumPy, Power BI, Tableau, MySQL",
      "Machine Learning: Scikit-learn, Random Forest, LightGBM, XGBoost",
      "AI & NLP: Hugging Face Transformers, Rasa",
      "Development Tools: Jupyter Notebook, Streamlit, Git, GitHub",
    ],
    responsibilities: [
      "Performed data preprocessing, cleaning, and exploratory data analysis using Python.",
      "Developed and evaluated machine learning models for classification and prediction tasks.",
      "Applied machine learning algorithms including Random Forest, LightGBM, and XGBoost.",
      "Created data visualizations and dashboards to present analytical insights.",
      "Developed interactive data science applications using Streamlit.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated strong analytical ability and practical exposure to data science and AI workflows.",
  },
  {
    key: "general",
    label: "General Staff",
    match: [],
    technologies: [
      "Productivity: Google Workspace / Microsoft 365, documentation tools",
      "Collaboration: Slack / team chat, project trackers",
      "Delivery: task ownership, reporting, stakeholder communication",
    ],
    responsibilities: [
      "Supported day-to-day project delivery and cross-team coordination.",
      "Maintained clear documentation and timely status updates.",
      "Contributed to process improvements and team goals.",
      "Uphold professional conduct and reliable ownership of assigned work.",
    ],
    assessment:
      "During {possessive} tenure, {pronoun} demonstrated professionalism, dedication, and reliable ownership of assigned responsibilities.",
  },
];

function normalizeHaystack(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => String(p || "").toLowerCase())
    .join(" ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCertificateRolePack(
  designation?: string | null,
  appRole?: string | null
): CertificateSuggestionPack {
  const hay = normalizeHaystack(designation, appRole);
  for (const pack of CERTIFICATE_ROLE_PACKS) {
    if (pack.key === "general") continue;
    if (pack.match.some((m) => hay.includes(m))) return pack;
  }
  // App role fallbacks
  const role = String(appRole || "").toLowerCase();
  if (role === "tester") {
    return CERTIFICATE_ROLE_PACKS.find((p) => p.key === "tester")!;
  }
  if (role === "creator") {
    return CERTIFICATE_ROLE_PACKS.find((p) => p.key === "creative")!;
  }
  if (role === "developer") {
    return CERTIFICATE_ROLE_PACKS.find((p) => p.key === "frontend")!;
  }
  return CERTIFICATE_ROLE_PACKS.find((p) => p.key === "general")!;
}

export function fillAssessmentTemplate(
  template: string,
  salutation: "Mr" | "Ms" | "Mx"
): string {
  const pronoun = salutation === "Ms" ? "she" : salutation === "Mr" ? "he" : "they";
  const possessive =
    salutation === "Ms" ? "her" : salutation === "Mr" ? "his" : "their";
  return template
    .replace(/\{pronoun\}/g, pronoun)
    .replace(/\{possessive\}/g, possessive);
}

export function buildCatalogCertificateSuggestion(input: {
  designation?: string | null;
  appRole?: string | null;
  salutation?: "Mr" | "Ms" | "Mx";
}): {
  packKey: string;
  packLabel: string;
  technologies: string;
  responsibilities: string;
  assessment: string;
  source: "catalog";
} {
  const pack = matchCertificateRolePack(input.designation, input.appRole);
  const salutation = input.salutation || "Mr";
  return {
    packKey: pack.key,
    packLabel: pack.label,
    technologies: pack.technologies.join("\n"),
    responsibilities: pack.responsibilities.join("\n"),
    assessment: fillAssessmentTemplate(pack.assessment, salutation),
    source: "catalog",
  };
}
