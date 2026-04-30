/**
 * DeploymentChecklistAgent — Runs all deployment checks and generates
 * a full human-readable report at docs/deployment-report.md.
 */

import fs from "fs";
import path from "path";
import { buildValidator, ValidationReport } from "./build-validator";
import { storeMetadataGenerator, StoreMetadata } from "./store-metadata-generator";

const ROOT = process.cwd();

function statusIcon(passed: boolean): string {
  return passed ? "✅" : "❌";
}

export async function runDeploymentChecklist(): Promise<{ reportPath: string; report: ValidationReport; iosReady: boolean; androidReady: boolean }> {
  console.log("[DeploymentAgent] 🚀 Running full deployment checklist...");

  // 1. Validate build configuration
  const report = await buildValidator.validateBuild();

  // 2. Generate store metadata (only if OpenAI key exists)
  let storeMetadata: StoreMetadata | null = null;
  if (process.env.OPENAI_API_KEY) {
    storeMetadata = await storeMetadataGenerator.generateStoreMetadata();
    if (storeMetadata) {
      storeMetadataGenerator.saveStoreMetadata(storeMetadata);
    }
  }

  // 3. Write the report
  const lines: string[] = [
    `# SameVibe Deployment Readiness Report`,
    `> Generated: ${new Date().toISOString()}`,
    ``,
    `## Overall Score: ${report.score}/100`,
    `| Platform | Status |`,
    `|----------|--------|`,
    `| iOS (App Store) | ${statusIcon(report.iosReady)} ${report.iosReady ? "Ready" : "Not Ready"} |`,
    `| Android (Play Store) | ${statusIcon(report.androidReady)} ${report.androidReady ? "Ready" : "Not Ready"} |`,
    ``,
    `## Checklist`,
    ``,
    `| Check | Status | Detail |`,
    `|-------|--------|--------|`,
    ...report.checks.map(c => `| ${c.name} | ${statusIcon(c.passed)} | ${c.detail} |`),
    ``,
  ];

  // Add fixes section for failed checks
  const failed = report.checks.filter(c => !c.passed && c.fix);
  if (failed.length > 0) {
    lines.push(`## 🔧 Required Fixes`);
    lines.push(``);
    for (const c of failed) {
      lines.push(`### ${c.name}`);
      lines.push(`**Fix:** ${c.fix}`);
      lines.push(``);
    }
  }

  // Add EAS build commands
  lines.push(`## EAS Build Commands`);
  lines.push(``);
  lines.push("```bash");
  lines.push(`# Install EAS CLI (if not installed)`);
  lines.push(`npm install -g eas-cli`);
  lines.push(``);
  lines.push(`# Login to Expo account`);
  lines.push(`eas login`);
  lines.push(``);
  lines.push(`# Configure EAS (first time)`);
  lines.push(`cd SameVibeMobile && eas build:configure`);
  lines.push(``);
  lines.push(`# Build for iOS (App Store)`);
  lines.push(`eas build --platform ios --profile production`);
  lines.push(``);
  lines.push(`# Build for Android (Play Store)`);
  lines.push(`eas build --platform android --profile production`);
  lines.push(``);
  lines.push(`# Submit to App Store`);
  lines.push(`eas submit --platform ios`);
  lines.push(``);
  lines.push(`# Submit to Play Store`);
  lines.push(`eas submit --platform android`);
  lines.push("```");
  lines.push(``);

  if (storeMetadata) {
    lines.push(`## Store Copy Preview`);
    lines.push(``);
    lines.push(`### App Store`);
    lines.push(`**Title:** ${storeMetadata.appStore.title}`);
    lines.push(`**Subtitle:** ${storeMetadata.appStore.subtitle}`);
    lines.push(`**Keywords:** \`${storeMetadata.appStore.keywords}\``);
    lines.push(``);
    lines.push(`### Play Store`);
    lines.push(`**Short Description:** ${storeMetadata.playStore.shortDescription}`);
    lines.push(``);
    lines.push(`> Full store copy saved to \`docs/store-metadata/\``);
  }

  const reportPath = path.join(ROOT, "docs", "deployment-report.md");
  const docsDir = path.dirname(reportPath);
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");

  console.log(`[DeploymentAgent] 📄 Report: ${reportPath}`);
  console.log(`[DeploymentAgent] iOS: ${report.iosReady ? "✅ Ready" : "❌ Not ready"} | Android: ${report.androidReady ? "✅ Ready" : "❌ Not ready"}`);

  return { reportPath, report, iosReady: report.iosReady, androidReady: report.androidReady };
}

export const deploymentChecklistAgent = { runDeploymentChecklist };
