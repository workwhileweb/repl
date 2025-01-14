import type { TelegramAccount } from 'mtcute-repl-worker/client'
import { computed } from 'nanostores'
import { linkedAtom } from './link.ts'

export const $accounts = linkedAtom<TelegramAccount[]>('accounts')
export const $activeAccountId = linkedAtom<string>('activeAccountId')

export const $activeAccount = computed([$accounts, $activeAccountId], (accounts, activeAccountId) => {
  if (!activeAccountId) return null

  const account = accounts.find(account => account.id === activeAccountId)
  if (!account) return null

  return account
})
