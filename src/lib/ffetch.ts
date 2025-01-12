import { ffetchAddons, ffetchBase } from '@fuman/fetch'
import { ffetchValitaAdapter } from '@fuman/fetch/valita'

export const ffetch = ffetchBase.extend({
  retry: {},
  addons: [
    ffetchAddons.parser(ffetchValitaAdapter({ mode: 'strip' })),
  ],
} as any) // todo
