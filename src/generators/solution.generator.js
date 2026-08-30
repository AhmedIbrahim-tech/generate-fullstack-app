import path from 'node:path';
import { runCommand, runCommandCapture } from '../utils/command.js';
import { logger } from '../utils/logger.js';

/**
 * @param {{ pascalName: string, targetDirectory: string }} options
 */
export async function generateSolution(options) {
  const slnFile = `${options.pascalName}.slnx`;
  const projects = [
    path.join('API', 'API.csproj'),
    path.join('Application', 'Application.csproj'),
    path.join('Domain', 'Domain.csproj'),
    path.join('Infrastructure', 'Infrastructure.csproj'),
  ];

  runCommand('dotnet', ['new', 'sln', '--name', options.pascalName, '--format', 'slnx', '--force'], {
    cwd: options.targetDirectory,
    step: 'Create solution',
  });

  const listed = runCommandCapture('dotnet', ['sln', slnFile, 'list'], {
    cwd: options.targetDirectory,
    step: 'List solution projects',
  });
  const listedText = `${listed.stdout ?? ''}\n${listed.stderr ?? ''}`.replaceAll('\\', '/');
  const missing = projects.filter((relative) => !listedText.includes(relative.replaceAll('\\', '/')));

  if (missing.length > 0) {
    runCommand('dotnet', ['sln', slnFile, 'add', ...missing], {
      cwd: options.targetDirectory,
      step: 'Add projects to solution',
    });
  }

  logger.success('Solution references configured');
}
