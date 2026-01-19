import fs from "fs";
import path from "path";
import process from "process";

const args = process.argv.slice(2);
const targetArgIndex = args.indexOf("--target");
const target =
  targetArgIndex !== -1 && args[targetArgIndex + 1]
    ? args[targetArgIndex + 1]
    : null;

const roots =
  target === "web-public" || target === "web-admin"
    ? [`apps/${target}`]
    : ["apps/web-public", "apps/web-admin"];

const forbiddenPatterns = [
  "firebasestorage.googleapis.com",
  "alt=media&token=",
  "galleryUrls",
  "heroUrl",
  "downloadToken"
];

function isTextFile(file) {
  return /\.(tsx?|jsx?|mjs)$/.test(file);
}

function shouldSkip(file) {
  return file.includes("node_modules") || file.includes("dist") || file.includes("build");
}

function walk(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (shouldSkip(full)) return;
    if (entry.isDirectory()) {
      walk(full, list);
    } else if (isTextFile(full)) {
      list.push(full);
    }
  });
  return list;
}

function checkFile(file, app) {
  const content = fs.readFileSync(file, "utf8");
  const violations = [];

  forbiddenPatterns.forEach((pat) => {
    if (content.includes(pat)) {
      violations.push(`Forbidden pattern "${pat}" found`);
    }
  });

  // Cross-app imports
  const importLines = content.split(/\r?\n/).filter((l) => l.includes("import") || l.includes("require"));
  importLines.forEach((line) => {
    const fromMatch = line.match(/from\s+["'](.+?)["']/);
    const bareImport = line.match(/import\s+["'](.+?)["']/);
    const requireMatch = line.match(/require\(\s*["'](.+?)["']\s*\)/);
    const targetPath = (fromMatch && fromMatch[1]) || (bareImport && bareImport[1]) || (requireMatch && requireMatch[1]);
    if (!targetPath) return;
    const normalized = targetPath.toLowerCase();
    if (app === "web-public") {
      if (normalized.includes("web-admin")) {
        violations.push(`Forbidden import in web-public: ${line.trim()}`);
      }
      if (/[\\/]+services[\\/]+api(?!client)([\\/.]|$)/.test(normalized)) {
        violations.push(`Forbidden import in web-public: ${line.trim()}`);
      }
    }
    if (app === "web-admin") {
      if (normalized.includes("web-public")) {
        violations.push(`Forbidden import in web-admin: ${line.trim()}`);
      }
    }
  });

  return violations;
}

let errors = [];

roots.forEach((root) => {
  const app = root.includes("web-public") ? "web-public" : "web-admin";
  const files = walk(root, []);
  files.forEach((file) => {
    const v = checkFile(file, app);
    v.forEach((msg) => {
      errors.push(`${file}: ${msg}`);
    });
  });
});

if (errors.length) {
  console.error("Guardrails violations:");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
} else {
  console.log("Guardrails passed");
}
