#!/usr/bin/env node
/**
 * Patch manifest.json with absolute PWA origin URLs required for Android share_target.
 * Relative action paths often fail to register on Android (Samsung, Chrome).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "public/manifest.json");
const DIST_MANIFEST_PATH = path.join(ROOT, "dist/manifest.json");

const DEFAULT_ORIGIN = "https://bugs.bugricer.com";

function resolveOrigin() {
  return (
    process.env.VITE_PWA_ORIGIN ||
    process.env.PWA_ORIGIN ||
    DEFAULT_ORIGIN
  ).replace(/\/$/, "");
}

export function patchPwaManifestFile(manifestPath, origin = resolveOrigin()) {
  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const base = `${origin}/`;

  manifest.id = base;
  manifest.start_url = base;
  manifest.scope = base;

  if (manifest.share_target) {
    manifest.share_target.action = `${origin}/share-target`;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return true;
}

export function patchPwaManifests() {
  const origin = resolveOrigin();
  const patchedPublic = patchPwaManifestFile(MANIFEST_PATH, origin);
  const patchedDist = patchPwaManifestFile(DIST_MANIFEST_PATH, origin);
  return { origin, patchedPublic, patchedDist };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = patchPwaManifests();
  console.log(
    `[patch-pwa-manifest] origin=${result.origin} public=${result.patchedPublic} dist=${result.patchedDist}`
  );
}
