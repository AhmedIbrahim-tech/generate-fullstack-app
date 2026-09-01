import {
  toCSharpType,
  csharpDefaultInitializer,
  groupFields,
} from '../fields/field-mappers.js';
import { planEnumFiles } from './enum.generator.js';
import { getBackendFilePath } from '../../utils/project-paths.js';

/**
 * @param {object} config
 * @returns {{ relativePath: string, contents: string, writeMode?: string, conflict?: object }[]}
 */
export function planDomainFiles(config) {
  const { singularName } = config.feature;
  const groups = groupFields(config.fields);

  /** @type {{ relativePath: string, contents: string, writeMode?: string, conflict?: object }[]} */
  const files = [
    {
      relativePath: getBackendFilePath(config, 'Domain', 'Entities', `${singularName}.cs`),
      contents: renderEntity(config, groups),
    },
  ];

  const hasNavigations =
    groups.toOne.length > 0 ||
    groups.toMany.length > 0 ||
    groups.mediaSingle.length > 0 ||
    groups.mediaMultiple.length > 0;

  if (hasNavigations) {
    files.push({
      relativePath: getBackendFilePath(
        config,
        'Domain',
        'Entities',
        'Generated',
        `${singularName}.Relationships.g.cs`,
      ),
      contents: renderRelationships(config, groups),
    });
  }

  // Enum types live under Domain/Enums and are only written when missing.
  files.push(...planEnumFiles(config));

  return files;
}

/**
 * The main entity file holds scalar + enum props and the foreign-key Guid
 * columns for to-one relationships and single media. Navigations live in the
 * generated partial so hand edits to the main file are safe.
 *
 * @param {object} config
 * @param {ReturnType<typeof groupFields>} groups
 */
function renderEntity(config, groups) {
  const { singularName } = config.feature;
  const ns = config.projectName;

  /** @type {string[]} */
  const lines = [];

  for (const field of groups.scalar) {
    lines.push(scalarProperty(field));
  }

  for (const field of groups.enums) {
    lines.push(scalarProperty(field));
  }

  for (const field of groups.toOne) {
    lines.push(foreignKeyProperty(field.foreignKeyName, field.nullable));
  }

  for (const field of groups.mediaSingle) {
    const nullable = !(field.required && !field.nullable);
    lines.push(foreignKeyProperty(field.foreignKeyName, nullable));
  }

  const enumUsing = groups.enums.length > 0 ? `using ${ns}.Domain.Enums;\n` : '';

  const body = lines.join('\n\n');

  return `${enumUsing}namespace ${ns}.Domain.Entities;

public sealed partial class ${singularName} : Common.BaseEntity
{
${body}
}
`;
}

/**
 * @param {object} field
 */
function scalarProperty(field) {
  const type = toCSharpType(field);
  const init = csharpDefaultInitializer(field);
  return `    public ${type} ${field.name} { get; set; }${init}`;
}

/**
 * @param {string} name
 * @param {boolean} nullable
 */
function foreignKeyProperty(name, nullable) {
  const type = nullable ? 'Guid?' : 'Guid';
  return `    public ${type} ${name} { get; set; }`;
}

/**
 * Navigation properties for the entity, emitted as a partial class so they can
 * be regenerated independently of the main entity file.
 *
 * @param {object} config
 * @param {ReturnType<typeof groupFields>} groups
 */
function renderRelationships(config, groups) {
  const { singularName } = config.feature;
  const ns = config.projectName;

  /** @type {string[]} */
  const lines = [];

  for (const field of groups.toOne) {
    lines.push(`    public ${field.target}? ${field.name} { get; set; }`);
  }

  for (const field of groups.toMany) {
    lines.push(
      `    public ICollection<${field.target}> ${field.collectionName} { get; set; } = new List<${field.target}>();`,
    );
  }

  for (const field of groups.mediaSingle) {
    lines.push(`    public StoredFile? ${field.name} { get; set; }`);
  }

  for (const field of groups.mediaMultiple) {
    lines.push(
      `    public ICollection<StoredFile> ${field.collectionName} { get; set; } = new List<StoredFile>();`,
    );
  }

  return `#nullable enable
namespace ${ns}.Domain.Entities;

public sealed partial class ${singularName}
{
${lines.join('\n\n')}
}
`;
}
