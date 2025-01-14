import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import type { StringSessionLibName } from './StringSessionImportDialog.tsx'
import { LucideChevronRight, LucideDownload, LucideKeyRound, LucideLaptop, LucideTextCursorInput } from 'lucide-solid'
import { createSignal, For } from 'solid-js'
import { Button } from '../../../lib/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../../lib/components/ui/dropdown-menu.tsx'
import { cn } from '../../../lib/utils.ts'
import { AuthKeyImportDialog } from './AuthKeyImportDialog.tsx'
import { StringSessionDefs, StringSessionImportDialog } from './StringSessionImportDialog.tsx'

export function ImportDropdown(props: { size: 'xs' | 'sm' }) {
  const [showImportStringSession, setShowImportStringSession] = createSignal(false)
  const [stringSessionLibName, setStringSessionLibName] = createSignal<StringSessionLibName>('mtcute')
  const [showImportAuthKey, setShowImportAuthKey] = createSignal(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          as={(triggerProps: DropdownMenuTriggerProps) => (
            <Button
              variant="outline"
              size={props.size}
              {...triggerProps}
            >
              <LucideDownload class={
                cn(
                  {
                    xs: 'mr-2 size-3',
                    sm: 'mr-2 size-3.5',
                  }[props.size],
                )
              }
              />
              Import
            </Button>
          )}
        />
        <DropdownMenuContent>
          <DropdownMenuItem class="py-1 text-xs" onClick={() => setShowImportAuthKey(true)}>
            <LucideKeyRound class="mr-2 size-3.5 stroke-[1.5px]" />
            Auth key
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="py-1 text-xs">
              <LucideTextCursorInput class="mr-2 size-3.5 stroke-[1.5px]" />
              String session
              <LucideChevronRight class="ml-2 size-3.5" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <For each={StringSessionDefs}>
                {def => (
                  <DropdownMenuItem
                    class="py-1 text-xs"
                    onClick={() => {
                      setStringSessionLibName(def.name)
                      setShowImportStringSession(true)
                    }}
                  >
                    {def.displayName}
                  </DropdownMenuItem>
                )}
              </For>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem class="py-1 text-xs">
            <LucideLaptop class="mr-2 size-3.5 stroke-[1.5px]" />
            Desktop (tdata)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StringSessionImportDialog
        open={showImportStringSession()}
        onClose={() => setShowImportStringSession(false)}
        chosenLibName={stringSessionLibName()}
        onChosenLibName={setStringSessionLibName}
      />

      <AuthKeyImportDialog
        open={showImportAuthKey()}
        onClose={() => setShowImportAuthKey(false)}
      />
    </>
  )
}
