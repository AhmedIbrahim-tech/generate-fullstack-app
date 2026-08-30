import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @param {string} targetPath
 */
export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} dirPath
 */
export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * @param {string} filePath
 * @param {string} contents
 */
export async function writeFile(filePath, contents) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, 'utf8');
}

/**
 * @param {string} filePath
 * @param {string} contents
 */
export async function writeFileIfMissing(filePath, contents) {
  if (await pathExists(filePath)) {
    return false;
  }

  await writeFile(filePath, contents);
  return true;
}

/**
 * @param {string} name
 * @param {Record<string, string>} replacements
 */
function applyName(name, replacements) {
  if (name === 'gitignore') {
    return '.gitignore';
  }

  if (name === 'env.example') {
    return '.env.example';
  }

  let result = name;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }

  return result;
}

/**
 * @param {string} contents
 * @param {Record<string, string>} replacements
 */
export function applyReplacements(contents, replacements) {
  let result = contents;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }

  return result;
}

/**
 * @param {string} from
 * @param {string} to
 * @param {Record<string, string>} [replacements]
 */
export async function copyTemplate(from, to, replacements = {}) {
  const stats = await fs.stat(from);

  if (stats.isDirectory()) {
    await ensureDir(to);
    const entries = await fs.readdir(from, { withFileTypes: true });
    for (const entry of entries) {
      const nextFrom = path.join(from, entry.name);
      const nextTo = path.join(to, applyName(entry.name, replacements));
      await copyTemplate(nextFrom, nextTo, replacements);
    }
    return;
  }

  const raw = await fs.readFile(from, 'utf8');
  await writeFile(to, applyReplacements(raw, replacements));
}

/**
 * @param {string} relativeFromSrc
 */
export function resolveFromSrc(relativeFromSrc) {
  const srcDir = path.dirname(fileURLToPath(new URL('../index.js', import.meta.url)));
  return path.join(srcDir, relativeFromSrc);
}

export function templatesRoot() {
  return resolveFromSrc('templates');
}

/**
 * @param {string} dirPath
 */
export async function isNonEmptyDirectory(dirPath) {
  if (!(await pathExists(dirPath))) {
    return false;
  }

  const stats = await fs.stat(dirPath);
  if (!stats.isDirectory()) {
    return true;
  }

  const entries = await fs.readdir(dirPath);
  return entries.length > 0;
}

/**
 * @param {string} csprojPath
 * @param {Record<string, string>} properties
 */
export async function upsertCsprojProperties(csprojPath, properties) {
  let xml = await fs.readFile(csprojPath, 'utf8');

  for (const [name, value] of Object.entries(properties)) {
    const existing = new RegExp(`<${name}>[\\s\\S]*?</${name}>`);
    if (existing.test(xml)) {
      xml = xml.replace(existing, `<${name}>${value}</${name}>`);
      continue;
    }

    xml = xml.replace(
      /<PropertyGroup>/,
      `<PropertyGroup>\n    <${name}>${value}</${name}>`,
    );
  }

  await fs.writeFile(csprojPath, xml, 'utf8');
}

/**
 * @param {string} dirPath
 * @param {(filePath: string) => boolean} predicate
 */
export async function removeFilesMatching(dirPath, predicate) {
  if (!(await pathExists(dirPath))) {
    return;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await removeFilesMatching(fullPath, predicate);
      continue;
    }

    if (predicate(fullPath)) {
      await fs.unlink(fullPath);
    }
  }
}
