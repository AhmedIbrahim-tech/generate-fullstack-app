const NON_ALNUM = /[^A-Za-z0-9]+/g;

/**
 * @param {string} input
 */
export function toFolderName(input) {
  return input.trim();
}

/**
 * @param {string} input
 */
export function toPascalCase(input) {
  const parts = input
    .trim()
    .replace(NON_ALNUM, ' ')
    .split(' ')
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * @param {string} pascalName
 */
export function toDisplayName(pascalName) {
  return pascalName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

/**
 * @param {string} input
 */
export function deriveNames(input) {
  const folderName = toFolderName(input);
  const pascalName = toPascalCase(input);
  const displayName = toDisplayName(pascalName);

  return {
    folderName,
    pascalName,
    displayName,
  };
}
