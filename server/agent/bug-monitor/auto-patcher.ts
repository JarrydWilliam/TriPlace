/**
 * AutoPatcher — Records AI-generated fix suggestions and applies safe patches.
 *
 * Safety policy:
 *  - NEVER modifies production source files automatically.
 *  - Writes all patches to docs/bug-patches/YYYY-MM-DD.md for developer review.
 *  - For safeToAutoPatch=true cases, also writes a ready-to-apply diff snippet.
 *  - Critical/unresolvable bugs are escalated to docs/bug-log.md.
 */

import fs from "fs";
import path from "path";
import { BugDiagnosis } from "./bug-analyzer";
import { CapturedError } from "./error-log-monitor";

const ROOT = process.cwd();
const PATCH_DIR = path.join(ROOT, "docs", "bug-patches");
const BUG_LOG = path.join(ROOT, "docs", "bug-log.md");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function appendToFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.appendFileSync(filePath, content + "\n", "utf-8");
}

export function recordPatch(error: CapturedError, diagnosis: BugDiagnosis): void {
  ensureDir(PATCH_DIR);
  const today = formatDate(new Date());
  const patchFile = path.join(PATCH_DIR, `${today}.md`);

  const content = [
    `## Bug: ${error.id} — ${new Date().toISOString()}`,
    `**Route:** \`${error.method ?? ""} ${error.route ?? "server-side"}\``,
    `**Error Message:** ${error.message.slice(0, 200)}`,
    ``,
    `**Diagnosis:** ${diagnosis.diagnosis}`,
    `**Root Cause:** ${diagnosis.rootCause}`,
    `**Confidence:** ${diagnosis.confidence}`,
    `**Affected Area:** \`${diagnosis.affectedArea}\``,
    ``,
    `### Suggested Fix`,
    "```typescript",
    diagnosis.fixSuggestion,
    "```",
    ``,
    diagnosis.safeToAutoPatch
      ? `> ✅ **Safe to apply** — Low-risk fix. Review and apply manually.`
      : `> ⚠️  **Manual review required** — Complex fix, do not apply blindly.`,
    ``,
    `---`,
    ``,
  ].join("\n");

  appendToFile(patchFile, content);
  console.log(`[AutoPatcher] 📝 Patch recorded: ${patchFile}`);
}

export function escalateCriticalBug(error: CapturedError, reason: string): void {
  const content = [
    `## 🚨 CRITICAL BUG — ${new Date().toISOString()}`,
    `**ID:** ${error.id}`,
    `**Route:** \`${error.method ?? ""} ${error.route ?? "server"}\``,
    `**Message:** ${error.message.slice(0, 300)}`,
    `**Escalation Reason:** ${reason}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  appendToFile(BUG_LOG, content);
  console.error(`[AutoPatcher] 🚨 Critical bug escalated to ${BUG_LOG}: ${error.id}`);
}

export const autoPatcher = { recordPatch, escalateCriticalBug };
