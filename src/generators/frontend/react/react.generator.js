import { generateNextFrontend } from './next/next.generator.js';
import { generateViteFrontend } from './vite/vite.generator.js';

/**
 * @param {object} options
 */
export async function generateReactFrontend(options) {
  if (options.frontend.framework === 'vite') {
    await generateViteFrontend(options);
    return;
  }

  await generateNextFrontend(options);
}
