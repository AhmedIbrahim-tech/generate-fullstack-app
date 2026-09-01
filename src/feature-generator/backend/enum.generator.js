import { groupFields } from '../fields/field-types.js';
import { getBackendFilePath } from '../../utils/project-paths.js';

/**
 * Plan enum source files for every enum field on the feature.
 *
 * Files use `writeMode: 'ifMissing'` so re-running the generator will not
 * clobber a hand-edited enum. Each plan carries a `conflict` descriptor that
 * the writer can use to detect an existing enum of the same name that declares
 * a different set of members.
 *
 * @param {object} config
 * @returns {{ relativePath: string, contents: string, writeMode: string, conflict: object }[]}
 */
export function planEnumFiles(config) {
  const ns = config.projectName;
  const { enums } = groupFields(config.fields);

  // De-duplicate by enum name (two fields may share the same enum type).
  /** @type {Map<string, object>} */
  const unique = new Map();
  for (const field of enums) {
    if (!unique.has(field.enumName)) {
      unique.set(field.enumName, field);
    } else {
      const existing = unique.get(field.enumName);
      if (
        existing.enumValues.join('|') !== field.enumValues.join('|')
      ) {
        throw new Error(
          `Enum "${field.enumName}" is declared with conflicting values in feature "${config.feature.singularName}".`,
        );
      }
    }
  }

  /** @type {{ relativePath: string, contents: string, writeMode: string, conflict: object }[]} */
  const files = [];

  for (const field of unique.values()) {
    files.push({
      relativePath: getBackendFilePath(config, 'Domain', 'Enums', `${field.enumName}.cs`),
      contents: renderEnum(ns, field),
      writeMode: 'ifMissing',
      conflict: {
        type: 'enum',
        name: field.enumName,
        values: [...field.enumValues],
      },
    });
  }

  return files;
}

/**
 * @param {string} ns
 * @param {object} field
 */
function renderEnum(ns, field) {
  const members = field.enumValues
    .map((value, index) => `    ${value} = ${index + 1},`)
    .join('\n');

  return `namespace ${ns}.Domain.Enums;

public enum ${field.enumName}
{
${members}
}
`;
}
