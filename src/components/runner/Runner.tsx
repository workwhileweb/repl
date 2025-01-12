import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import type { ConnectionState } from '@mtcute/web'
import type { CustomTypeScriptWorker } from '../editor/utils/custom-worker.ts'
import { LucideCheck, LucidePlay, LucidePlug, LucideRefreshCw, LucideUnplug } from 'lucide-solid'
import { languages, Uri } from 'monaco-editor/esm/vs/editor/editor.api.js'
import { nanoid } from 'nanoid'
import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js'
import { Button } from '../../lib/components/ui/button.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuGroupLabel, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../lib/components/ui/dropdown-menu.tsx'
import { cn } from '../../lib/utils.ts'
import { $activeAccountId } from '../../store/accounts.ts'
import { $tabs } from '../../store/tabs.ts'
import { useStore } from '../../store/use-store.ts'
import { swForgetScript, swUploadScript } from '../../sw/client.ts'
import { Devtools } from './Devtools.tsx'

export function Runner() {
  const [devtoolsIframe, setDevtoolsIframe] = createSignal<HTMLIFrameElement | undefined>()
  const [runnerLoaded, setRunnerLoaded] = createSignal(false)
  const [running, setRunning] = createSignal(false)
  const [connectionState, setConnectionState] = createSignal<ConnectionState>('offline')
  const currentAccountId = useStore($activeAccountId)

  let currentScriptId: string | undefined

  let runnerIframeRef!: HTMLIFrameElement

  function handleMessage(e: MessageEvent) {
    if (e.source === runnerIframeRef.contentWindow) {
      // event from runner iframe
      switch (e.data.event) {
        case 'TO_DEVTOOLS': {
          devtoolsIframe()?.contentWindow!.postMessage(e.data.value, '*')
          break
        }
        case 'SCRIPT_END': {
          setRunning(false)
          swForgetScript(currentScriptId!)
          currentScriptId = undefined
          break
        }
        case 'CONNECTION_STATE': {
          setConnectionState(e.data.value)
          break
        }
      }
      return
    }

    if (e.source === devtoolsIframe()?.contentWindow) {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data

      if (data.method === 'Page.getResourceTree' && !runnerLoaded()) {
        // for some reason, responding to this method is required for console.log to work
        // and since our runner might not be loaded yet, noone will respond to this message
        e.source!.postMessage(JSON.stringify({ id: data.id, result: {} }), '*')
        return
      }

      if (data.method === 'Page.reload') {
        location.reload()
        return
      }

      runnerIframeRef.contentWindow!.postMessage({ event: 'FROM_DEVTOOLS', value: e.data }, '*')
    }
  }

  onMount(async () => {
    window.addEventListener('message', handleMessage)
  })
  onCleanup(() => {
    window.removeEventListener('message', handleMessage)
  })

  createEffect(on(currentAccountId, (accountId) => {
    if (!runnerLoaded()) return
    runnerIframeRef.contentWindow!.postMessage({
      event: 'ACCOUNT_CHANGED',
      accountId,
    }, '*')
  }, { defer: true }))

  async function handleRun() {
    const getWorker = await languages.typescript.getTypeScriptWorker()
    const worker = await getWorker(Uri.parse('file:///main.ts')) as unknown as CustomTypeScriptWorker

    const tabs = $tabs.get()
    const processed = await Promise.all(tabs.map(tab => worker.processFile(`file:///${tab.fileName}`, tab.main)))

    const files: Record<string, string> = {}
    let exports: string[] | undefined
    for (let i = 0; i < processed.length; i++) {
      const processedFile = processed[i]
      const tab = tabs[i]
      files[tab.fileName.replace(/\.ts$/, '.js')] = processedFile.transformed
      if (tab.main) {
        exports = processedFile.exports
      }
    }

    currentScriptId = nanoid()
    await swUploadScript(currentScriptId, files)

    runnerIframeRef.contentWindow!.postMessage({
      event: 'RUN',
      scriptId: currentScriptId,
      exports,
    }, '*')
    setRunning(true)
  }

  function handleDisconnect() {
    runnerIframeRef.contentWindow!.postMessage({ event: 'DISCONNECT' }, '*')
  }

  function handleConnect() {
    runnerIframeRef.contentWindow!.postMessage({ event: 'RECONNECT' }, '*')
  }

  function handleRestart() {
    runnerIframeRef.contentWindow!.location.reload()
  }

  return (
    <>
      <div class="flex shrink-0 flex-row p-1">
        <iframe
          class="invisible size-0"
          src="/sw/runtime/_iframe.html"
          ref={runnerIframeRef}
          onLoad={() => {
            runnerIframeRef.contentWindow!.postMessage({
              event: 'INIT',
              accountId: currentAccountId(),
            }, '*')
            setRunnerLoaded(true)
          }}
        />
        <div class="flex w-full grow-0 flex-row">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleRun}
            disabled={!runnerLoaded() || running()}
          >
            <LucidePlay
              class="mr-2 size-3"
            />
            Run
          </Button>
          <div class="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger
              as={(props: DropdownMenuTriggerProps) => (
                <Button
                  variant="ghost"
                  size="xs"
                  {...props}
                >
                  {{
                    offline: 'Disconnected',
                    connecting: 'Connecting...',
                    updating: 'Updating...',
                    connected: 'Ready',
                  }[connectionState()]}
                  <div class={cn(
                    'ml-2 size-2 rounded-full',
                    {
                      connected: 'bg-green-500',
                      updating: 'bg-yellow-500',
                      connecting: 'bg-yellow-500',
                      offline: 'bg-neutral-400',
                    }[connectionState()],
                  )}
                  />
                </Button>
              )}
            />
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={connectionState() === 'offline' ? handleConnect : handleDisconnect}
                class="text-xs"
              >
                {connectionState() === 'offline' ? (
                  <LucidePlug
                    class="mr-2 size-3"
                  />
                ) : (
                  <LucideUnplug
                    class="mr-2 size-3"
                  />
                )}
                {connectionState() === 'offline' ? 'Connect' : 'Disconnect'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRestart}
                class="text-xs"
              >
                <LucideRefreshCw
                  class="mr-2 size-3"
                />
                Restart runner
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuGroupLabel class="text-xs">
                  Auto-disconnect after
                </DropdownMenuGroupLabel>
                <DropdownMenuItem class="text-xs">
                  1 minute
                  <LucideCheck class="ml-auto size-3" />
                </DropdownMenuItem>
                <DropdownMenuItem class="text-xs">
                  5 minutes
                </DropdownMenuItem>
                <DropdownMenuItem class="text-xs">
                  15 minutes
                </DropdownMenuItem>
                <DropdownMenuItem class="text-xs">
                  Never
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div class="h-px shrink-0 bg-border" />
      <Devtools
        class="size-full grow-0"
        iframeRef={setDevtoolsIframe}
      />
    </>
  )
}
