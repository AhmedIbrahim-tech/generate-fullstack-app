import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDir, pathExists } from '../../utils/filesystem.js';

export const STAGING_DIR_NAME = 'temp-frontend-scaffold';

/**
 * @param {string} targetDirectory
 * @param {string} frontendDirectory
 * @param {string} folderName
 */
export async function promoteStagingClient(targetDirectory, frontendDirectory, folderName) {
  const stagingDir = path.join(targetDirectory, STAGING_DIR_NAME);
  await ensureDir(frontendDirectory);

  if (path.resolve(stagingDir) !== path.resolve(frontendDirectory)) {
    if (path.resolve(frontendDirectory) === path.resolve(targetDirectory)) {
      // Frontend-only: move all files from staging into targetDirectory
      const entries = await fs.readdir(stagingDir);
      for (const entry of entries) {
        const src = path.join(stagingDir, entry);
        const dest = path.join(targetDirectory, entry);
        await fs.rename(src, dest);
      }
      await fs.rm(stagingDir, { recursive: true, force: true });
    } else {
      // Full stack: rename staging dir to frontendDirectory (e.g. Frontend/)
      if (await pathExists(frontendDirectory)) {
        await fs.rm(frontendDirectory, { recursive: true, force: true });
      }
      await fs.rename(stagingDir, frontendDirectory);
    }
  }

  // Set npm package name cleanly based on project name without "client" or "web-client"
  const cleanPackageName = folderName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  await setClientPackageName(frontendDirectory, cleanPackageName);

  return frontendDirectory;
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
