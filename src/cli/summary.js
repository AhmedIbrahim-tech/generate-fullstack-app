import { describeFrontend } from '../models/frontend.js';
import { logger } from '../utils/logger.js';

/**
 * @param {object} options
 */
export function printGenerationSummary(options) {
  const frontend = options.frontend;
  const lines = [
    '',
    'Project:',
    options.folderName,
    '',
    'Backend:',
    options.backend ? 'ASP.NET Core Web API' : 'None',
    '',
    'Frontend:',
    describeFrontend(frontend),
  ];

  if (frontend.enabled && frontend.library === 'react') {
    lines.push(
      '',
      'State:',
      'Redux Toolkit',
      '',
      'API Client:',
      frontend.framework === 'next' ? 'Axios + server fetch' : 'Axios',
      '',
      'Forms:',
      'React Hook Form + Zod',
      '',
      'Styling:',
      'Tailwind CSS',
      '',
      'Localization:',
      options.localization
        ? frontend.framework === 'next'
          ? 'next-intl'
          : 'react-i18next'
        : 'None',
    );
  }

  if (frontend.enabled && frontend.library === 'angular') {
    lines.push(
      '',
      'State:',
      'NgRx',
      '',
      'HTTP:',
      'Angular HttpClient',
      '',
      'Forms:',
      'Angular Reactive Forms',
      '',
      'Styling:',
      'Tailwind CSS',
      '',
      'Localization:',
      options.localization ? 'Cookie-based I18nService (en/ar, RTL/LTR)' : 'None',
    );
  }

  if (options.packageManager) {
    lines.push('', 'Package manager:', options.packageManager);
  }

  process.stdout.write(`${lines.join('\n')}\n\n`);
}

/**
 * @param {object} options
 */
export function logSelection(options) {
  logger.info(`Frontend: ${describeFrontend(options.frontend)}`);
}
