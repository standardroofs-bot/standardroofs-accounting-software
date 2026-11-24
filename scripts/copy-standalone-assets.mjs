import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");
const staticSrc = path.join(rootDir, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("[Standalone Assets] Copying static and public assets to standalone bundle...");

if (fs.existsSync(standaloneDir)) {
  copyDirRecursive(publicSrc, publicDest);
  copyDirRecursive(staticSrc, staticDest);
  console.log("[Standalone Assets] Successfully copied public/ and .next/static/ to .next/standalone!");
} else {
  console.warn("[Standalone Assets] Warning: .next/standalone does not exist yet.");
}
