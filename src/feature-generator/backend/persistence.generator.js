import path from 'node:path';
import { groupFields, hasMediaField } from '../fields/field-mappers.js';

/**
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
export function planPersistenceFiles(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;

  return [
    {
      relativePath: path.join(
        'Infrastructure',
        'Persistence',
        'Configurations',
        `${singularName}Configuration.cs`,
      ),
      contents: renderConfiguration(config),
    },
    {
      relativePath: path.join(
        'Application',
        'Abstractions',
        'Persistence',
        `IApplicationDbContext.${pluralName}.g.cs`,
      ),
      contents: `using Microsoft.EntityFrameworkCore;
using ${ns}.Domain.Entities;

namespace ${ns}.Application.Abstractions.Persistence;

public partial interface IApplicationDbContext
{
    DbSet<${singularName}> ${pluralName} { get; }
}
`,
    },
    {
      relativePath: path.join(
        'Infrastructure',
        'Persistence',
        `ApplicationDbContext.${pluralName}.g.cs`,
      ),
      contents: `using Microsoft.EntityFrameworkCore;
using ${ns}.Domain.Entities;

namespace ${ns}.Infrastructure.Persistence;

public partial class ApplicationDbContext
{
    public DbSet<${singularName}> ${pluralName} => Set<${singularName}>();
}
`,
    },
  ];
}

/**
 * @param {object} config
 */
function storageAvailable(config) {
  return config.hasFileStorage ?? hasMediaField(config.fields);
}

/**
 * @param {object} config
 */
function renderConfiguration(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  const groups = groupFields(config.fields);
  const hasStorage = storageAvailable(config);

  /** @type {string[]} */
  const blocks = [];

  const scalarBlock = groups.scalar
    .map((field) => scalarConfig(field))
    .filter(Boolean)
    .join('\n\n');
  if (scalarBlock) {
    blocks.push(scalarBlock);
  }

  const enumBlock = groups.enums
    .map((field) => enumConfig(field))
    .join('\n\n');
  if (enumBlock) {
    blocks.push(enumBlock);
  }

  const toOneBlock = groups.toOne
    .map((field) => toOneConfig(field))
    .join('\n\n');
  if (toOneBlock) {
    blocks.push(toOneBlock);
  }

  const toManyBlock = groups.toMany
    .map((field) => toManyConfig(singularName, field))
    .join('\n\n');
  if (toManyBlock) {
    blocks.push(toManyBlock);
  }

  if (hasStorage) {
    const singleMediaBlock = groups.mediaSingle
      .map((field) => mediaSingleConfig(field))
      .join('\n\n');
    if (singleMediaBlock) {
      blocks.push(singleMediaBlock);
    }

    const multiMediaBlock = groups.mediaMultiple
      .map((field) => mediaMultipleConfig(singularName, field))
      .join('\n\n');
    if (multiMediaBlock) {
      blocks.push(multiMediaBlock);
    }
  }

  const configBody = blocks.length > 0 ? `\n${blocks.join('\n\n')}\n` : '\n';

  return `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ${ns}.Domain.Entities;

namespace ${ns}.Infrastructure.Persistence.Configurations;

public sealed partial class ${singularName}Configuration : IEntityTypeConfiguration<${singularName}>
{
    public void Configure(EntityTypeBuilder<${singularName}> builder)
    {
        builder.ToTable("${pluralName}");
        builder.HasKey(entity => entity.Id);
${configBody}    }
}
`;
}

/**
 * @param {object} field
 */
function scalarConfig(field) {
  if (field.type === 'string') {
    const max = field.maxLength ?? 200;
    const required = field.required && !field.nullable ? '.IsRequired()' : '';
    return `        builder.Property(entity => entity.${field.name})
            ${required ? `${required}\n            ` : ''}.HasMaxLength(${max});`;
  }

  if (field.type === 'decimal') {
    return `        builder.Property(entity => entity.${field.name})
            .HasPrecision(${field.precision ?? 18}, ${field.scale ?? 2});`;
  }

  if (field.required && !field.nullable && field.type !== 'boolean') {
    return `        builder.Property(entity => entity.${field.name}).IsRequired();`;
  }

  return null;
}

/**
 * @param {object} field
 */
function enumConfig(field) {
  const required = field.required && !field.nullable ? '\n            .IsRequired()' : '';
  return `        builder.Property(entity => entity.${field.name})
            .HasConversion<int>()${required};`;
}

/**
 * @param {object} field
 */
function toOneConfig(field) {
  const requiredCall = field.required && !field.nullable
    ? '\n            .IsRequired()'
    : '';

  return `        builder.HasOne(entity => entity.${field.name})
            .WithMany()
            .HasForeignKey(entity => entity.${field.foreignKeyName})
            .OnDelete(DeleteBehavior.${field.deleteBehavior})${requiredCall};

        builder.HasIndex(entity => entity.${field.foreignKeyName});`;
}

/**
 * @param {string} singularName
 * @param {object} field
 */
function toManyConfig(singularName, field) {
  if (field.relationshipType === 'one-to-many') {
    return `        builder.HasMany(entity => entity.${field.collectionName})
            .WithOne()
            .OnDelete(DeleteBehavior.${field.deleteBehavior});`;
  }

  const joinTable = `${singularName}${field.collectionName}`;
  return `        builder.HasMany(entity => entity.${field.collectionName})
            .WithMany()
            .UsingEntity(join => join.ToTable("${joinTable}"));`;
}

/**
 * @param {object} field
 */
function mediaSingleConfig(field) {
  return `        builder.HasOne<StoredFile>()
            .WithMany()
            .HasForeignKey(entity => entity.${field.foreignKeyName})
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(entity => entity.${field.foreignKeyName});`;
}

/**
 * @param {string} singularName
 * @param {object} field
 */
function mediaMultipleConfig(singularName, field) {
  const joinTable = `${singularName}${field.collectionName}`;
  return `        builder.HasMany(entity => entity.${field.collectionName})
            .WithMany()
            .UsingEntity(join => join.ToTable("${joinTable}"));`;
}
