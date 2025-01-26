import type { RunnerController } from './components/runner/Runner.tsx'

import { ColorModeProvider, ColorModeScript } from '@kobalte/core'
import { QueryClient } from '@tanstack/solid-query'
import { PersistQueryClientProvider } from '@tanstack/solid-query-persist-client'
import { LucidePartyPopper } from 'lucide-solid'
import { workerInit } from 'mtcute-repl-worker/client'
import { createSignal, lazy, onCleanup, onMount, Show } from 'solid-js'
import { toast } from 'solid-sonner'
import { ChangelogDialog } from './components/changelog/Changelog.tsx'
import { EditorTabs } from './components/editor/EditorTabs.tsx'
import { NavbarMenu } from './components/nav/NavbarMenu.tsx'
import { Runner } from './components/runner/Runner.tsx'
import { SettingsDialog, type SettingsTab } from './components/settings/Settings.tsx'
import { Updater } from './components/Updater.tsx'
import { Resizable, ResizableHandle, ResizablePanel } from './lib/components/ui/resizable.tsx'
import { Toaster } from './lib/components/ui/sonner.tsx'
import { createIdbPersister } from './store/query-persist.ts'

const Editor = lazy(() => import('./components/editor/Editor.tsx'))

const queryClient = new QueryClient()

export function App() {
  const [updating, setUpdating] = createSignal(true)
  const [showChangelog, setShowChangelog] = createSignal(false)
  const [showSettings, setShowSettings] = createSignal(false)
  const [settingsTab, setSettingsTab] = createSignal<SettingsTab>('accounts')
  const [runnerController, setRunnerController] = createSignal<RunnerController>()
  const [iframeLoading, setIframeLoading] = createSignal(true)

  const [isResizing, setIsResizing] = createSignal(false)
  const [sizes, setSizes] = createSignal([0.5, 0.5])

  let workerIframe!: HTMLIFrameElement

  onMount(() => {
    const localBuild = localStorage.getItem('repl:buildVersion')
    const latestBuild: string = import.meta.env.BUILD_VERSION

    if (localBuild === null || new Date(localBuild) !== new Date(latestBuild)) {
      localStorage.setItem('repl:buildVersion', latestBuild)
      queryClient.clear()
      setTimeout(() => {
        toast.custom(t => (
          <div
            class="flex cursor-pointer items-center rounded-md border p-6"
            onClick={() => {
              setShowChangelog(true)
              toast.dismiss(t)
            }}
          >
            <LucidePartyPopper class="ml-1.5 mr-4" />
            <div class="flex flex-col">
              <div class="text-sm font-semibold">Playground updated!</div>
              <div class="text-sm opacity-90">Click here to see the latest changes.</div>
            </div>
          </div>
        ), {
          important: true,
        })
      }, 1000)
    }

    workerInit(workerIframe).then(() => {
      setIframeLoading(false)
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === ',') {
        setShowSettings(true)
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
  })

  return (
    <div class="flex h-screen w-screen flex-col overflow-hidden">
      <Toaster />
      <ColorModeScript />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: createIdbPersister(),
        }}
      >
        <ColorModeProvider>
          <iframe
            ref={workerIframe}
            class="invisible size-0"
            src={import.meta.env.VITE_IFRAME_URL}
            on:error={() => {
              toast('Worker iframe failed to load, try reloading the page')
            }}
          />
          <nav class="relative flex h-auto w-full shrink-0 flex-row items-center justify-between overflow-hidden px-4 py-2">
            <h1 class="font-mono text-base">
              @mtcute/
              <b>playground</b>
            </h1>

            <div class="flex items-center gap-1">
              <NavbarMenu
                iframeLoading={iframeLoading()}
                onShowAccounts={() => {
                  setShowSettings(true)
                  setSettingsTab('accounts')
                }}
                onShowChangelog={() => {
                  setShowChangelog(true)
                }}
                onShowSettings={() => {
                  setShowSettings(true)
                }}
              />
            </div>
          </nav>
          <div class="h-px shrink-0 bg-border" />
          <Show
            when={!updating()}
            fallback={(
              <Updater
                iframeLoading={iframeLoading()}
                onComplete={() => setUpdating(false)}
              />
            )}
          >
            <Resizable sizes={sizes()} onSizesChange={e => setSizes(e)} orientation="horizontal" class="size-full max-h-[calc(100vh-57px)]">
              <ResizablePanel class="h-full overflow-x-auto overflow-y-hidden" minSize={0.2}>
                <EditorTabs />
                <Editor
                  class="size-full"
                  onRun={() => runnerController()?.run()}
                />
              </ResizablePanel>
              <ResizableHandle
                withHandle
                onDblClick={() => {
                  setSizes([0.5, 0.5])
                }}
                onMouseDown={() => setIsResizing(true)}
                onMouseUp={() => setIsResizing(false)}
              />
              <ResizablePanel
                class="flex max-h-full flex-col overflow-hidden"
                minSize={0.2}
              >
                <Runner
                  isResizing={isResizing()}
                  controllerRef={setRunnerController}
                />
              </ResizablePanel>
            </Resizable>
          </Show>

          <ChangelogDialog
            show={showChangelog()}
            onClose={() => setShowChangelog(false)}
          />

          <SettingsDialog
            show={showSettings()}
            onClose={() => setShowSettings(false)}
            tab={settingsTab()}
            onTabChange={setSettingsTab}
          />
        </ColorModeProvider>
      </PersistQueryClientProvider>
    </div>
  )
}
