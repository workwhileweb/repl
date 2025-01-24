import * as v from '@badrap/valita'
import { persistentAtom } from '@nanostores/persistent'
import { linkAtom } from './link.ts'

export interface TelegramAccount {
  id: string
  name: string
  bot: boolean
  testMode: boolean
  telegramId: number
  dcId: number
  apiOptions?: CustomApiFields
}

export interface CustomApiFields {
  apiId: string
  apiHash: string
  deviceModel: string
  systemVersion: string
  appVersion: string
  systemLangCode: string
  langPack: string
  langCode: string
  extraJson: string
}

const AccountSchema = v.object({
  _v: v.literal(1),
  id: v.string(),
  telegramId: v.number(),
  bot: v.boolean(),
  name: v.string(),
  testMode: v.boolean(),
  dcId: v.number(),
  apiOptions: v.object({
    apiId: v.string(),
    apiHash: v.string(),
    deviceModel: v.string(),
    systemVersion: v.string(),
    appVersion: v.string(),
    systemLangCode: v.string(),
    langPack: v.string(),
    langCode: v.string(),
    extraJson: v.string(),
  }).optional(),
})

export const $accounts = persistentAtom<TelegramAccount[]>('repl:accounts', [], {
  encode: v => JSON.stringify(v.map(a => ({ ...a, _v: 1 }))),
  decode: (str) => {
    const arr = JSON.parse(str)
    const res: TelegramAccount[] = []

    for (const account of arr) {
      const parsed = AccountSchema.try(account)
      if (parsed.ok) {
        res.push(parsed.value)
      }
    }

    return res
  },
})
linkAtom($accounts, 'accounts')

export const $activeAccountId = persistentAtom<string>('repl:activeAccountId')
linkAtom($activeAccountId, 'activeAccountId')
