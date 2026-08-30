import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathExists } from '../../utils/filesystem.js';

export function getClientDir(targetDirectory) {
  return path.join(targetDirectory, 'Client');
}

export const CLIENT_STAGING_NAME = 'web-client';

/**
 * @param {string} targetDirectory
 * @param {string} folderName
 */
export async function promoteStagingClient(targetDirectory, folderName) {
  const stagingDir = path.join(targetDirectory, CLIENT_STAGING_NAME);
  const clientDir = getClientDir(targetDirectory);
  await fs.rename(stagingDir, clientDir);
  await setClientPackageName(clientDir, `${folderName.toLowerCase()}-client`);
  return clientDir;
}

/**
 * @param {string} clientDir
 * @param {string} packageName
 */
export async function setClientPackageName(clientDir, packageName) {
  const packageJsonPath = path.join(clientDir, 'package.json');
  if (!(await pathExists(packageJsonPath))) {
    return;
  }

  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  pkg.name = packageName;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}
