import * as v from '@badrap/valita'
import { persistentAtom } from '@nanostores/persistent'
import { computed } from 'nanostores'

export interface TelegramAccount {
  id: string
  name: string
  bot: boolean
  testMode: boolean
  telegramId: number
  dcId: number
}

const AccountSchema = v.object({
  _v: v.literal(1),
  id: v.string(),
  telegramId: v.number(),
  bot: v.boolean(),
  name: v.string(),
  testMode: v.boolean(),
  dcId: v.number(),
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

export const $activeAccountId = persistentAtom<string>('repl:activeAccountId')
export const $activeAccount = computed([$accounts, $activeAccountId], (accounts, activeAccountId) => {
  if (!activeAccountId) return null

  const account = accounts.find(account => account.id === activeAccountId)
  if (!account) return null

  return account
})
