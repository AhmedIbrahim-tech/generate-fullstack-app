export class GenerationError extends Error {
  /**
   * @param {string} message
   * @param {{ step?: string, command?: string, targetDirectory?: string }} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'GenerationError';
    this.step = details.step ?? 'Unknown step';
    this.command = details.command ?? '(none)';
    this.targetDirectory = details.targetDirectory ?? '(unknown)';
  }
}
