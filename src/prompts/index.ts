import template from './system.md';

const systemPrompt = template
  .replace('{{cwd}}', process.cwd())
  .replace('{{date}}', new Date().toLocaleDateString())
  .replace('{{platform}}', process.platform)
  .replace('{{shell}}', process.env.SHELL || 'unknown');

export { systemPrompt };
