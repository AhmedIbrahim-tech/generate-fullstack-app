import { planDomainFiles } from './domain.generator.js';
import { planPersistenceFiles } from './persistence.generator.js';
import { planApplicationFiles } from './application.generator.js';
import { planApiFiles } from './api.generator.js';
import { planFileStorageInfrastructure } from './file-storage.generator.js';
import { hasMediaField } from '../fields/field-mappers.js';
import { getBackendFilePath } from '../../utils/project-paths.js';

/**
 * @param {object} config
 * @param {{ hasFileStorage?: boolean }} [context]
 */
export function planBackendFeature(config, context = {}) {
  if (!config.generation.backend) {
    return [];
  }

  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];

  if (hasMediaField(config.fields) && !context.hasFileStorage) {
    files.push(...planFileStorageInfrastructure(config.projectName, config));
  }

  files.push(...planDomainFiles(config));
  files.push(...planPersistenceFiles(config));
  files.push(...planApplicationFiles(config));
  files.push(...planApiFiles(config));

  return files;
}

/**
 * Conflict markers for an existing backend feature.
 * @param {object} config
 */
export function backendConflictPaths(config) {
  const { singularName, pluralName } = config.feature;
  return [
    getBackendFilePath(config, 'Domain', 'Entities', `${singularName}.cs`),
    getBackendFilePath(config, 'Application', 'Features', pluralName),
    getBackendFilePath(config, 'API', 'Controllers', `${pluralName}Controller.cs`),
  ];
}
