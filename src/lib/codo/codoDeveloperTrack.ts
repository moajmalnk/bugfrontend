/**
 * Why: Web and app developers share API, data, and release rules, but layout,
 * SEO, and native WebView rules are not the same job. Tabs stay honest by
 * marking each developer rule as web, app, or shared.
 */
export type DeveloperTrack = "web" | "app" | "shared";

const WEB_ONLY = new Set([
  "dev_rule_11",
  "dev_rule_12",
  "dev_rule_13",
  "dev_rule_14",
  "dev_rule_15",
  "dev_rule_16",
  "dev_rule_20",
  "dev_rule_26",
  "dev_rule_28",
  "dev_rule_30",
  "dev_rule_31",
  "dev_rule_33",
  "dev_rule_35",
  "dev_rule_36",
  "dev_rule_37",
  "dev_rule_38",
  "dev_rule_40",
  "dev_rule_43",
  "dev_rule_44",
  "dev_rule_45",
  "dev_rule_48",
  "dev_rule_49",
  "dev_rule_69",
  "dev_rule_70",
  "dev_rule_71",
  "dev_rule_72",
]);

const APP_ONLY = new Set(["dev_rule_68"]);

export function developerTrack(ruleKey: string): DeveloperTrack {
  if (WEB_ONLY.has(ruleKey)) return "web";
  if (APP_ONLY.has(ruleKey)) return "app";
  return "shared";
}

export function ruleOnDeveloperTrack(
  ruleKey: string,
  track: "web" | "app"
): boolean {
  const kind = developerTrack(ruleKey);
  return kind === "shared" || kind === track;
}
