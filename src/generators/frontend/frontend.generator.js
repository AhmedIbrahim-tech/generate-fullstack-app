import { generateReactFrontend } from './react/react.generator.js';
import { generateAngularFrontend } from './angular/angular.generator.js';

/**
 * @param {object} options
 */
export async function generateFrontend(options) {
  if (!options.frontend?.enabled) {
    return;
  }

  if (options.frontend.library === 'angular') {
    await generateAngularFrontend(options);
    return;
  }

  await generateReactFrontend(options);
}
