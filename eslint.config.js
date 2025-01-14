import antfu from '@antfu/eslint-config'
import tailwind from 'eslint-plugin-tailwindcss'

import tailwindConfig from 'eslint-plugin-tailwindcss/lib/config/rules.js'

const mappedTailwindConfig = {}
for (const [key, value] of Object.entries(tailwindConfig)) {
  mappedTailwindConfig[key.replace('tailwindcss/', 'tw/')] = [value, {
    config: 'packages/repl/tailwind.config.js',
  }]
}

export default antfu({
  ignores: [
    'src/components/Editor/utils/*.json',
    'vendor',
  ],
  typescript: true,
  solid: true,
  yaml: false,
  rules: {
    'node/prefer-global/process': 'off',
    'style/multiline-ternary': 'off',
    'curly': ['error', 'multi-line'],
    'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'n/prefer-global/buffer': 'off',
    'style/quotes': ['error', 'single', { avoidEscape: true }],
    'antfu/if-newline': 'off',
    'import/no-relative-packages': 'error',
    'style/max-statements-per-line': ['error', { max: 2 }],
    'ts/no-redeclare': 'off',
    'unused-imports/no-unused-imports': 'error',
    'ts/no-empty-object-type': 'off',
    ...mappedTailwindConfig,
  },
  plugins: {
    tw: tailwind,
  },
})
