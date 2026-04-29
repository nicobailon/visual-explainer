/**
 * Visual Explainer plugin for OpenCode.ai
 *
 * Auto-registers the visual-explainer skill directory via config hook.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const VisualExplainerPlugin = async () => {
  return {
    // Inject skills path so OpenCode discovers the visual-explainer skill
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      const skillPath = path.resolve(__dirname, '../../../plugins/visual-explainer');
      if (!config.skills.paths.includes(skillPath)) {
        config.skills.paths.push(skillPath);
      }
    },
  };
};
