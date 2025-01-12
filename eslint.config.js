import antfu from '@antfu/eslint-config'
import tailwind from 'eslint-plugin-tailwindcss'

export default antfu({
  ignores: [
    'src/components/Editor/utils/*.json',
    'vendor',
  ],
  typescript: true,
  solid: true,
  yaml: false,
  rules: {
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
  },
  plugins: {
    tw: tailwind,
  },
}, tailwind.configs['flat/recommended'])
