import { planDomainFiles } from './domain.generator.js';
import { planPersistenceFiles } from './persistence.generator.js';
import { planApplicationFiles } from './application.generator.js';
import { planServiceApplicationFiles, planApplicationServiceRegistry } from './application-services.generator.js';
import { planApiFiles } from './api.generator.js';
import { planFileStorageInfrastructure, planFileStorageRegistry } from './file-storage.generator.js';
import { hasMediaField } from '../fields/field-mappers.js';
import { getBackendFilePath } from '../../utils/project-paths.js';
import { isServicesArchitecture, usesDapper } from './architecture.js';
import { planDapperRepositoryRegistry } from './dapper-persistence.generator.js';

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
  files.push(
    ...(isServicesArchitecture(config.architecture)
      ? planServiceApplicationFiles(config)
      : planApplicationFiles(config)),
  );
  files.push(...planApiFiles(config));

  return files;
}

/**
 * Registry updates for Application Services DI (no-op for CQRS).
 * @param {object} config
 * @param {{ hasFileStorage?: boolean }} [context]
 */
export function planBackendRegistryUpdates(config, context = {}) {
  if (!config.generation.backend) {
    return [];
  }

  /** @type {{ relativePath: string, update: (existing: string) => string }[]} */
  const updates = [];

  if (usesDapper(config.orm)) {
    updates.push(planDapperRepositoryRegistry(config));
  }

  if (isServicesArchitecture(config.architecture)) {
    updates.push(planApplicationServiceRegistry(config));
  }

  if (hasMediaField(config.fields) && !context.hasFileStorage) {
    updates.push(...planFileStorageRegistry(config));
  }

  return updates;
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
