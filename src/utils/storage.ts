import fs from "fs";
import path from "path";

import type { ChatSession } from "./models";
import { storageDir } from "./models";

function sanitizeSegment(segment: string) {
  const trimmed = segment.trim().toLowerCase();
  const withoutDashes = trimmed.replace(/[-\u2010-\u2015\u2212]+/g, "_");
  const separated = withoutDashes.replace(/[.\s]+/g, "_");
  const safeCharacters = separated.replace(/[^a-z0-9_]/g, "_");
  const compact = safeCharacters.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return compact.length > 0 ? compact : "file";
}

export function buildStoredFilename(file: ChatSession["files"][number]) {
  const base = sanitizeSegment(file.name ?? "file");
  const extension = (file.extension ?? "").toLowerCase();
  return extension ? `${file.hash}-${base}.${extension}` : `${file.hash}-${base}`;
}

export function getStoredFilePath(file: ChatSession["files"][number]) {
  const prefix = `${file.hash}-`;
  const existing = fs.readdirSync(storageDir).find((storedFile) => storedFile.startsWith(prefix));

  if (existing) {
    return path.join(storageDir, existing);
  }

  return path.join(storageDir, buildStoredFilename(file));
}
