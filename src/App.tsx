import Resizable from '@corvu/resizable'
import { createSignal, lazy } from 'solid-js'

import { EditorTabs } from './components/editor/EditorTabs.tsx'
import { NavbarMenu } from './components/nav/NavbarMenu.tsx'
import { Runner } from './components/runner/Runner.tsx'
import { SettingsDialog, type SettingsTab } from './components/settings/Settings.tsx'
import { Updater } from './components/Updater.tsx'
import { ResizableHandle, ResizablePanel } from './lib/components/ui/resizable.tsx'

const Editor = lazy(() => import('./components/editor/Editor.tsx'))

export function App() {
  const [versions, setVersions] = createSignal<Record<string, string> | undefined>(undefined)
  const [showSettings, setShowSettings] = createSignal(false)
  const [settingsTab, setSettingsTab] = createSignal<SettingsTab>('accounts')

  return (
    <div class="flex h-screen w-screen flex-col overflow-hidden">
      <nav class="relative flex h-auto w-full shrink-0 flex-row items-center overflow-hidden px-4 py-2">
        <h1 class="font-mono text-base">
          @mtcute/
          <b>playground</b>
        </h1>

        <NavbarMenu
          onShowAccounts={() => {
            setShowSettings(true)
            setSettingsTab('accounts')
          }}
          onShowSettings={() => {
            setShowSettings(true)
          }}
        />
      </nav>
      <div class="h-px shrink-0 bg-border" />
      {versions() === undefined ? (
        <Updater
          onComplete={setVersions}
        />
      ) : (
        <Resizable orientation="horizontal" class="size-full max-h-[calc(100vh-57px)]">
          <ResizablePanel class="h-full overflow-x-auto overflow-y-hidden" minSize={0.2}>
            <EditorTabs />
            <Editor class="size-full" />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            class="flex max-h-full flex-col overflow-hidden"
            minSize={0.2}
          >
            <Runner />
          </ResizablePanel>
        </Resizable>
      )}

      <SettingsDialog
        show={showSettings()}
        onClose={() => setShowSettings(false)}
        tab={settingsTab()}
        onTabChange={setSettingsTab}
      />
    </div>
  )
}
