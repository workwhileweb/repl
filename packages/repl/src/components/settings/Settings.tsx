import type { JSX } from 'solid-js'
import { LucideCode, LucideLibrary, LucideUsers } from 'lucide-solid'
import { For } from 'solid-js'
import { Button } from '../../lib/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
} from '../../lib/components/ui/dialog.tsx'
import { cn } from '../../lib/utils.ts'
import { AboutTab } from './AboutTab.tsx'
import { AccountsTab } from './AccountsTab.tsx'
import { LibrariesTab } from './LibrariesTab.tsx'

export type SettingsTab =
  | 'accounts'
  | 'libraries'
  | 'about'
interface TabDefinition {
  id: SettingsTab
  title: string
  icon: (props: { class?: string }) => JSX.Element
  content: () => JSX.Element
}

const tabs: Array<TabDefinition> = [
  {
    id: 'accounts',
    title: 'Accounts',
    icon: LucideUsers,
    content: AccountsTab,
  },
  {
    id: 'libraries',
    title: 'Libraries',
    icon: LucideLibrary,
    content: LibrariesTab,
  },
  {
    id: 'about',
    title: 'About',
    icon: LucideCode,
    content: AboutTab,
  },
]

export function SettingsDialog(props: {
  show: boolean
  onClose: () => void
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}) {
  return (
    <Dialog
      open={props.show}
      onOpenChange={open => !open && props.onClose()}
    >
      <DialogContent class="h-[calc(100vh-96px)] w-[calc(100vw-96px)] max-w-[960px] overflow-auto p-0">
        <div class="flex max-w-full flex-row overflow-hidden">
          <div class="flex h-full w-60 flex-col gap-1 p-2">
            <For each={tabs}>
              {tab => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => props.onTabChange(tab.id)}
                  class={cn(
                    'text-left justify-start text-sm h-8 text-muted-foreground',
                    props.tab === tab.id && 'bg-accent text-accent-foreground',
                  )}
                >
                  <tab.icon class="mr-2 size-4" />
                  {tab.title}
                </Button>
              )}
            </For>
          </div>
          <div class="w-px bg-border" />
          <div class="size-full max-w-full overflow-hidden">
            {tabs.find(tab => tab.id === props.tab)?.content()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
