import type { BaseTelegramClient, SentCode, User } from '@mtcute/web'
import type { TelegramAccount } from '../store/accounts.ts'
import { assert } from '@fuman/utils'
import { tl } from '@mtcute/web'
import { checkPassword, resendCode, sendCode, signIn, signInQr } from '@mtcute/web/methods.js'
import { renderSVG } from 'uqr'
import { $accounts, $activeAccountId } from '../store/accounts.ts'
import { createInternalClient, deleteAccount } from '../utils/telegram.ts'
import { emitEvent } from './utils.ts'

const clients = new Map<string, BaseTelegramClient>()
function getClient(accountId: string) {
  const client = clients.get(accountId)
  if (!client) throw new Error('Client not found')
  return client
}

async function handleAuthSuccess(accountId: string, user: User) {
  const client = getClient(accountId)
  const dcs = await client.mt.storage.dcs.fetch()
  const dcId = dcs?.main.id ?? 2
  const testMode = client.params.testMode ?? false

  const account: TelegramAccount = {
    id: accountId,
    name: user.displayName,
    telegramId: user.id,
    bot: user.isBot,
    testMode,
    dcId,
  }
  $accounts.set([
    ...$accounts.get(),
    account,
  ])
  $activeAccountId.set(accountId)

  return account
}

export class ReplWorkerTelegram {
  async createClient(params: {
    accountId: string
    testMode?: boolean
  }) {
    const client = createInternalClient(params.accountId, params.testMode)
    clients.set(params.accountId, client)
  }

  async disposeClient(params: {
    accountId: string
    forget?: boolean
  }) {
    const client = clients.get(params.accountId)
    if (!client) return
    await client.close()
    clients.delete(params.accountId)

    if (params.forget) {
      await deleteAccount(params.accountId)
    }
  }

  async loadCountries(params: {
    accountId: string
  }): Promise<{ countries: tl.help.RawCountry[], countryByIp: string }> {
    const client = getClient(params.accountId)

    const [
      countries,
      nearestDc,
    ] = await Promise.all([
      client.call({ _: 'help.getCountriesList', langCode: 'en', hash: 0 }),
      client.call({ _: 'help.getNearestDc' }),
    ])

    assert(countries._ === 'help.countriesList') // todo caching

    return {
      countries: countries.countries,
      countryByIp: nearestDc.country.toUpperCase(),
    }
  }

  async signInQr(params: {
    accountId: string
    abortSignal: AbortSignal
  }): Promise<TelegramAccount | 'need_password'> {
    const { accountId, abortSignal } = params
    const client = getClient(accountId)

    try {
      const user = await signInQr(client, {
        abortSignal,
        onUrlUpdated: qr => emitEvent('QrCodeUpdate', { accountId, qrCode: renderSVG(qr) }),
        onQrScanned: () => emitEvent('QrCodeScanned', { accountId }),
      })

      return await handleAuthSuccess(accountId, user)
    } catch (e) {
      if (tl.RpcError.is(e, 'SESSION_PASSWORD_NEEDED')) {
        return 'need_password'
      } else {
        throw e
      }
    }
  }

  async sendCode(params: {
    accountId: string
    phone: string
    abortSignal: AbortSignal
  }): Promise<SentCode> {
    const { accountId, phone, abortSignal } = params

    const code = await sendCode(getClient(accountId), {
      phone,
      abortSignal,
    })

    return (code as any).toJSON()
  }

  async resendCode(params: {
    accountId: string
    phone: string
    phoneCodeHash: string
    abortSignal: AbortSignal
  }): Promise<SentCode> {
    const { accountId, phone, phoneCodeHash, abortSignal } = params

    const code = await resendCode(getClient(accountId), {
      phone,
      phoneCodeHash,
      abortSignal,
    })

    return (code as any).toJSON()
  }

  async signIn(params: {
    accountId: string
    phone: string
    phoneCodeHash: string
    phoneCode: string
    abortSignal?: AbortSignal
  }): Promise<TelegramAccount | 'need_password'> {
    const { accountId, phone, phoneCodeHash, phoneCode, abortSignal } = params
    try {
      const user = await signIn(getClient(accountId), {
        phone,
        phoneCodeHash,
        phoneCode,
        abortSignal,
      })

      return await handleAuthSuccess(accountId, user)
    } catch (e) {
      if (tl.RpcError.is(e, 'SESSION_PASSWORD_NEEDED')) {
        return 'need_password'
      } else {
        throw e
      }
    }
  }

  async checkPassword(params: {
    accountId: string
    password: string
    abortSignal: AbortSignal
  }): Promise<TelegramAccount> {
    const { accountId, password, abortSignal } = params

    try {
      const user = await checkPassword(getClient(accountId), {
        password,
        abortSignal,
      })
      return await handleAuthSuccess(accountId, user)
    } catch (e) {
      if (tl.RpcError.is(e, 'PASSWORD_HASH_INVALID')) {
        throw new Error('Incorrect password')
      } else {
        throw e
      }
    }
  }

  async fetchAvatar(accountId: string) {
    const res = await fetch(`/sw/avatar/${accountId}/avatar.jpg`)
    if (!res.ok) {
      return null
    } else {
      return new Uint8Array(await res.arrayBuffer())
    }
  }
}
