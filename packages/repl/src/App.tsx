import { ColorModeProvider, ColorModeScript } from '@kobalte/core'

import { workerInit } from 'mtcute-repl-worker/client'
import { createSignal, lazy, onMount, Show } from 'solid-js'
import { EditorTabs } from './components/editor/EditorTabs.tsx'
import { NavbarMenu } from './components/nav/NavbarMenu.tsx'
import { Runner } from './components/runner/Runner.tsx'
import { SettingsDialog, type SettingsTab } from './components/settings/Settings.tsx'
import { Updater } from './components/Updater.tsx'
import { Resizable, ResizableHandle, ResizablePanel } from './lib/components/ui/resizable.tsx'
import { Toaster } from './lib/components/ui/sonner.tsx'

const Editor = lazy(() => import('./components/editor/Editor.tsx'))

export function App() {
  const [updating, setUpdating] = createSignal(true)
  const [showSettings, setShowSettings] = createSignal(false)
  const [settingsTab, setSettingsTab] = createSignal<SettingsTab>('accounts')

  const [isResizing, setIsResizing] = createSignal(false)
  const [sizes, setSizes] = createSignal([0.5, 0.5])

  let workerIframe!: HTMLIFrameElement

  onMount(() => {
    workerInit(workerIframe)
  })

  return (
    <div class="flex h-screen w-screen flex-col overflow-hidden">
      <Toaster />
      <ColorModeScript />
      <ColorModeProvider>
        <iframe
          ref={workerIframe}
          class="invisible size-0"
          src={import.meta.env.VITE_IFRAME_URL}
        />
        <nav class="relative flex h-auto w-full shrink-0 flex-row items-center justify-between overflow-hidden px-4 py-2">
          <h1 class="font-mono text-base">
            @mtcute/
            <b>playground</b>
          </h1>

          <div class="flex items-center gap-1">
            <NavbarMenu
              onShowAccounts={() => {
                setShowSettings(true)
                setSettingsTab('accounts')
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
              onComplete={() => setUpdating(false)}
            />
          )}
        >
          <Resizable sizes={sizes()} onSizesChange={e => setSizes(e)} orientation="horizontal" class="size-full max-h-[calc(100vh-57px)]">
            <ResizablePanel class="h-full overflow-x-auto overflow-y-hidden" minSize={0.2}>
              <EditorTabs />
              <Editor class="size-full" />
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
              <Runner isResizing={isResizing()} />
            </ResizablePanel>
          </Resizable>
        </Show>

        <SettingsDialog
          show={showSettings()}
          onClose={() => setShowSettings(false)}
          tab={settingsTab()}
          onTabChange={setSettingsTab}
        />
      </ColorModeProvider>
    </div>
  )
}
