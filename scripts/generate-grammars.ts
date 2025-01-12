import { writeFile } from 'node:fs/promises'
import { ffetchBase as ffetch } from '@fuman/fetch'
import { plist2js } from 'plist2'

const plist = await ffetch('https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/refs/heads/master/TypeScript.tmLanguage').text()

const grammar = plist2js(plist)

await writeFile(
  new URL('../src/components/Editor/utils/typescript.tmLanguage.json', import.meta.url),
  JSON.stringify(grammar, null, 2),
)
