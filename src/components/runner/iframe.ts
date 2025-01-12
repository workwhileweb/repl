import { TelegramClient } from '@mtcute/web?external'

type ConnectionState = import('@mtcute/web').ConnectionState
type TelegramClientOptions = import('@mtcute/web').TelegramClientOptions

declare const chobitsu: any

declare const window: typeof globalThis & {
  __currentScript: any
  __handleScriptEnd: (error: any) => void
  tg: import('@mtcute/web').TelegramClient
}

function sendToDevtools(message: any) {
  window.parent.postMessage({ event: 'TO_DEVTOOLS', value: message }, '*')
}

function sendToChobitsu(message: any) {
  message.id = `__chobitsu_manual__${Date.now()}`
  chobitsu.sendRawMessage(JSON.stringify(message))
}

chobitsu.setOnMessage((message: string) => {
  if (message.includes('__chobitsu_manual__')) return
  sendToDevtools(message)
})

let lastAccountId: string | undefined
let lastConnectionState: ConnectionState | undefined

function initClient(accountId: string) {
  lastAccountId = accountId

  let extraConfig: Partial<TelegramClientOptions> | undefined

  const storedAccounts = localStorage.getItem('repl:accounts')
  if (storedAccounts) {
    const accounts = JSON.parse(storedAccounts)
    const ourAccount = accounts.find((it: any) => it.id === accountId)

    if (ourAccount && ourAccount.testMode) {
      extraConfig = {
        testMode: true,
      }
    }
  }

  window.tg = new TelegramClient({
    apiId: import.meta.env.VITE_API_ID,
    apiHash: import.meta.env.VITE_API_HASH,
    storage: `mtcute:${accountId}`,
    ...extraConfig,
  })
  window.tg.onConnectionState.add((state) => {
    lastConnectionState = state
    window.parent.postMessage({ event: 'CONNECTION_STATE', value: state }, '*')
  })
}

window.addEventListener('message', ({ data }) => {
  if (data.event === 'INIT') {
    sendToDevtools({
      method: 'Page.frameNavigated',
      params: {
        frame: {
          id: '1',
          mimeType: 'text/html',
          securityOrigin: location.origin,
          url: location.href,
        },
        type: 'Navigation',
      },
    })

    sendToDevtools({ method: 'Runtime.executionContextsCleared' })
    sendToChobitsu({ method: 'Runtime.enable' })
    sendToChobitsu({ method: 'DOMStorage.enable' })
    sendToDevtools({ method: 'DOM.documentUpdated' })

    initClient(data.accountId)
    window.tg.connect()
  } else if (data.event === 'RUN') {
    const el = document.createElement('script')
    el.type = 'module'
    let script = `import * as result from "/sw/runtime/script/${data.scriptId}/main.js";`
    for (const exportName of data.exports ?? []) {
      script += `window.${exportName} = result.${exportName};`
    }
    if (data.exports?.length) {
      script += `console.log("[mtcute-repl] Script ended, exported variables: ${data.exports.join(', ')}");`
    } else {
      script += 'console.log("[mtcute-repl] Script ended");'
    }
    script += 'window.__handleScriptEnd();'
    el.textContent = script
    el.addEventListener('error', e => window.__handleScriptEnd(e.error))
    window.__currentScript = el
    document.body.appendChild(el)
  } else if (data.event === 'FROM_DEVTOOLS') {
    chobitsu.sendRawMessage(data.value)
  } else if (data.event === 'ACCOUNT_CHANGED') {
    window.tg?.close()
    initClient(data.accountId)

    if (lastConnectionState !== 'offline') {
      window.parent.postMessage({ event: 'CONNECTION_STATE', value: 'offline' }, '*')
      window.tg.connect()
    }
  } else if (data.event === 'DISCONNECT') {
    // todo: we dont have a clean way to disconnect i think
    window.tg?.close()
    if (lastAccountId) {
      initClient(lastAccountId)
    }
    window.parent.postMessage({ event: 'CONNECTION_STATE', value: 'offline' }, '*')
  } else if (data.event === 'RECONNECT') {
    window.tg.connect()
  }
})

window.__handleScriptEnd = (error) => {
  if (!window.__currentScript) return
  window.parent.postMessage({ event: 'SCRIPT_END', error }, '*')
  window.__currentScript.remove()
  window.__currentScript = undefined
}

window.addEventListener('error', (e) => {
  if (window.__currentScript) {
    window.__handleScriptEnd(e.error)
  }
})
