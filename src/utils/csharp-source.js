/**
 * Small, idempotent C# source mutations used by architecture-aware generation.
 * These helpers never emit *.g.cs files; they update the canonical source file.
 */

/**
 * @param {string} source
 */
export function ensureTrailingNewline(source) {
  if (!source) {
    return '\n';
  }
  return source.endsWith('\n') ? source : `${source}\n`;
}

/**
 * @param {string} source
 * @param {number} openIndex Index of the opening `{`
 * @returns {number} Index of the matching `}`, or -1
 */
export function findMatchingBrace(source, openIndex) {
  if (openIndex < 0 || source[openIndex] !== '{') {
    return -1;
  }

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const ch = source[index];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

/**
 * @param {string} source
 * @param {string} typeName
 * @returns {{ start: number, openBrace: number, closeBrace: number } | null}
 */
export function findTypeSpan(source, typeName) {
  const pattern = new RegExp(
    `(?:public|internal|file)(?:\\s+(?:static|abstract|sealed|partial))*\\s+(?:class|interface|struct|record)\\s+${typeName}\\b`,
  );
  const match = source.match(pattern);
  if (!match || match.index == null) {
    return null;
  }

  const openBrace = source.indexOf('{', match.index);
  const closeBrace = findMatchingBrace(source, openBrace);
  if (openBrace < 0 || closeBrace < 0) {
    return null;
  }

  return { start: match.index, openBrace, closeBrace };
}

/**
 * Insert a using directive after the last existing using, or at the top.
 * @param {string} source
 * @param {string} usingLine
 */
export function upsertUsing(source, usingLine) {
  const trimmed = usingLine.trim();
  const statement = trimmed.endsWith(';') ? trimmed : `${trimmed};`;
  const line = statement.startsWith('using ') ? statement : `using ${statement}`;

  if (source.includes(line)) {
    return source;
  }

  const usingLineRegex = /^using\s+[\w.= ]+\s*;\s*$/gm;
  let lastUsing = null;
  let current = usingLineRegex.exec(source);
  while (current) {
    lastUsing = current;
    current = usingLineRegex.exec(source);
  }

  if (lastUsing) {
    const insertAt = lastUsing.index + lastUsing[0].length;
    const prefix = source.slice(0, insertAt);
    const suffix = source.slice(insertAt);
    const separator = prefix.endsWith('\n') ? '' : '\n';
    return `${prefix}${separator}${line}\n${suffix.replace(/^\r?\n/, '\n')}`;
  }

  return `${line}\n${source}`;
}

/**
 * Replace or insert a nested `public static class` inside a parent type.
 * @param {string} source
 * @param {string} parentTypeName
 * @param {string} nestedClassName
 * @param {string} nestedClassBody Inner members, already indented with 8 spaces
 */
export function upsertNestedStaticClass(source, parentTypeName, nestedClassName, nestedClassBody) {
  const parent = findTypeSpan(source, parentTypeName);
  if (!parent) {
    throw new Error(`Could not find type "${parentTypeName}" to update.`);
  }

  const nested = `    public static class ${nestedClassName}\n    {\n${nestedClassBody}\n    }`;
  const parentBody = source.slice(parent.openBrace + 1, parent.closeBrace);
  const nestedSpan = findTypeSpan(parentBody, nestedClassName);

  if (nestedSpan) {
    const absoluteStart = parent.openBrace + 1 + nestedSpan.start;
    const absoluteEnd = parent.openBrace + 1 + nestedSpan.closeBrace;
    const before = source.slice(0, absoluteStart);
    const after = source.slice(absoluteEnd + 1);
    return ensureTrailingNewline(`${before}${nested}${after}`);
  }

  const insertion = `\n${nested}\n`;
  return ensureTrailingNewline(
    `${source.slice(0, parent.closeBrace)}${insertion}${source.slice(parent.closeBrace)}`,
  );
}

/**
 * Insert a class/interface member before the type's closing brace when missing.
 * @param {string} source
 * @param {string} typeName
 * @param {string} member
 */
export function upsertTypeMember(source, typeName, member) {
  const span = findTypeSpan(source, typeName);
  if (!span) {
    throw new Error(`Could not find type "${typeName}" to update.`);
  }

  const compact = member.replace(/\s+/g, ' ').trim();
  const existing = source.slice(span.openBrace, span.closeBrace + 1);
  if (existing.replace(/\s+/g, ' ').includes(compact)) {
    return ensureTrailingNewline(source);
  }

  const beforeClose = source.slice(0, span.closeBrace);
  const needsNewline = beforeClose.endsWith('\n') ? '' : '\n';
  return ensureTrailingNewline(
    `${beforeClose}${needsNewline}${member}\n${source.slice(span.closeBrace)}`,
  );
}

/**
 * Insert a statement inside a method body when missing.
 * @param {string} source
 * @param {string} methodName
 * @param {string} statement
 */
export function upsertMethodStatement(source, methodName, statement) {
  const trimmed = statement.trim();
  if (source.includes(trimmed)) {
    return ensureTrailingNewline(source);
  }

  const signature = new RegExp(
    `${methodName}\\s*\\([^;]*\\)\\s*\\{`,
  );
  const match = source.match(signature);
  if (!match || match.index == null) {
    throw new Error(`Could not find method "${methodName}" to update.`);
  }

  const openBrace = source.indexOf('{', match.index + match[0].length - 1);
  const closeBrace = findMatchingBrace(source, openBrace);
  if (openBrace < 0 || closeBrace < 0) {
    throw new Error(`Could not find body for method "${methodName}".`);
  }

  const indent = '        ';
  const line = trimmed.startsWith(indent) ? trimmed : `${indent}${trimmed}`;
  const beforeClose = source.slice(0, closeBrace);
  const needsNewline = beforeClose.endsWith('\n') ? '' : '\n';
  return ensureTrailingNewline(
    `${beforeClose}${needsNewline}${line}\n${source.slice(closeBrace)}`,
  );
}
