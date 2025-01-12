import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import latte from '@catppuccin/vscode/themes/latte.json' with { type: 'json' }
import mocha from '@catppuccin/vscode/themes/mocha.json' with { type: 'json' }

import { convertTheme } from 'monaco-vscode-textmate-theme-converter'

const OUT_DIR = fileURLToPath(new URL('./../src/components/Editor/utils', import.meta.url))

const latteConverted = convertTheme(latte as any)
latteConverted.colors['editor.background'] = '#ffffff'
latteConverted.colors['editorGutter.background'] = '#ffffff'

writeFileSync(join(OUT_DIR, 'latte.json'), JSON.stringify(latteConverted, null, 2))
writeFileSync(join(OUT_DIR, 'mocha.json'), JSON.stringify(convertTheme(mocha as any), null, 2))
