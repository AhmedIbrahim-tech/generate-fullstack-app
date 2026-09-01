import {
  convertTypeScriptToJavaScript,
  toJavaScriptFileName,
} from '../../generators/frontend/react/javascript.js';
import { isTypeScript } from '../feature-profile.js';

/**
 * Convert a single source string to the language selected in the manifest.
 *
 * @param {string} source
 * @param {object} config
 */
export function emitSource(source, config) {
  if (isTypeScript(config)) {
    return source;
  }
  return convertTypeScriptToJavaScript(source);
}

/**
 * Emit feature files with the language selected in the manifest.
 * TypeScript sources are converted here so planners do not depend on the
 * project overlay converter.
 *
 * @param {{ relativePath: string, contents: string, writeMode?: string }[]} files
 * @param {object} config
 */
export function emitFrontendLanguage(files, config) {
  if (isTypeScript(config)) {
    return files;
  }

  return files.map((file) => ({
    ...file,
    relativePath: toJavaScriptFileName(file.relativePath),
    contents: convertTypeScriptToJavaScript(file.contents),
  }));
}

/**
 * @param {object} config
 * @param {string} tsName
 */
export function frontendSourceName(config, tsName) {
  if (isTypeScript(config)) {
    return tsName;
  }
  return toJavaScriptFileName(tsName);
}
