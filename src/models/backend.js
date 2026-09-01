export const BACKEND_ARCHITECTURES = /** @type {const} */ (['cqrs-mediatr', 'services']);
export const BACKEND_MAPPINGS = /** @type {const} */ (['manual', 'automapper']);
export const BACKEND_ORMS = /** @type {const} */ (['efcore', 'dapper', 'efcore-dapper']);
export const BACKEND_DATABASES = /** @type {const} */ (['sqlserver', 'postgresql', 'sqlite']);
export const BACKEND_LOGGINGS = /** @type {const} */ (['serilog', 'ilogger']);
export const BACKEND_BACKGROUND_JOBS = /** @type {const} */ (['none', 'hangfire']);
export const BACKEND_REALTIMES = /** @type {const} */ (['none', 'signalr']);
export const BACKEND_AUTHENTICATIONS = /** @type {const} */ (['identity-jwt', 'identity', 'none']);

/**
 * @typedef {object} BackendSelection
 * @property {boolean} enabled
 * @property {'cqrs-mediatr' | 'services'} [architecture]
 * @property {'manual' | 'automapper'} [mapping]
 * @property {'efcore' | 'dapper' | 'efcore-dapper'} [orm]
 * @property {'sqlserver' | 'postgresql' | 'sqlite'} [database]
 * @property {'serilog' | 'ilogger'} [logging]
 * @property {'none' | 'hangfire'} [backgroundJobs]
 * @property {'none' | 'signalr'} [realtime]
 * @property {'identity-jwt' | 'identity' | 'none'} [authentication]
 */

/**
 * Recommended ASP.NET Core Clean Architecture defaults.
 * @returns {BackendSelection}
 */
export function defaultBackendSelection() {
  return {
    enabled: true,
    architecture: 'cqrs-mediatr',
    mapping: 'manual',
    orm: 'efcore',
    database: 'sqlserver',
    logging: 'serilog',
    backgroundJobs: 'none',
    realtime: 'none',
    authentication: 'identity-jwt',
  };
}

/**
 * @param {BackendSelection | null | undefined} backend
 */
export function describeBackend(backend) {
  if (!backend || !backend.enabled) {
    return 'None';
  }

  const parts = ['ASP.NET Core Web API', 'Clean Architecture'];

  if (backend.architecture === 'cqrs-mediatr') {
    parts.push('CQRS + MediatR');
  } else if (backend.architecture === 'services') {
    parts.push('Application Services');
  }

  if (backend.orm === 'efcore') {
    parts.push('EF Core');
  } else if (backend.orm === 'dapper') {
    parts.push('Dapper');
  } else if (backend.orm === 'efcore-dapper') {
    parts.push('EF Core + Dapper');
  }

  if (backend.database === 'sqlserver') {
    parts.push('SQL Server');
  } else if (backend.database === 'postgresql') {
    parts.push('PostgreSQL');
  } else if (backend.database === 'sqlite') {
    parts.push('SQLite');
  }

  if (backend.authentication === 'identity-jwt') {
    parts.push('Identity + JWT');
  } else if (backend.authentication === 'identity') {
    parts.push('Identity (Cookie/Local)');
  }

  if (backend.logging === 'serilog') {
    parts.push('Serilog');
  } else if (backend.logging === 'ilogger') {
    parts.push('Built-in ILogger');
  }

  if (backend.realtime === 'signalr') {
    parts.push('SignalR');
  }

  if (backend.backgroundJobs === 'hangfire') {
    parts.push('Hangfire');
  }

  return parts.join(' | ');
}
