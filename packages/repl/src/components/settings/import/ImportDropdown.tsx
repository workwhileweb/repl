import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import type { StringSessionLibName } from 'mtcute-repl-worker/client'
import { LucideBot, LucideChevronRight, LucideDownload, LucideKeyRound, LucideLaptop, LucideStore, LucideTextCursorInput } from 'lucide-solid'
import { createSignal, For, Show } from 'solid-js'
import { toast } from 'solid-sonner'
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
import { AuthKeyImportDialog } from './AuthKeyImportDialog.tsx'
import { BotTokenImportDialog } from './BotTokenImportDialog.tsx'
import { StringSessionDefs, StringSessionImportDialog } from './StringSessionImportDialog.tsx'
import { TdataImportDialog } from './tdata/TdataImportDialog.tsx'

function isFirstApril() {
  const date = new Date()
  return date.getMonth() === 3 && date.getDate() === 1 // April, 1st
}

export function ImportDropdown(props: { size: 'xs' | 'sm' }) {
  const [showImportStringSession, setShowImportStringSession] = createSignal(false)
  const [stringSessionLibName, setStringSessionLibName] = createSignal<StringSessionLibName>('mtcute')
  const [showImportAuthKey, setShowImportAuthKey] = createSignal(false)
  const [showImportBotToken, setShowImportBotToken] = createSignal(false)
  const [showImportTdata, setShowImportTdata] = createSignal(false)

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
              <LucideDownload class={{
                xs: 'mr-2 size-3',
                sm: 'mr-2 size-3.5',
              }[props.size]}
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
          <DropdownMenuItem class="py-1 text-xs" onClick={() => setShowImportBotToken(true)}>
            <LucideBot class="mr-2 size-3.5 stroke-[1.5px]" />
            Bot token
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
          <Show when={isFirstApril()}>
            <DropdownMenuItem
              class="py-1 text-xs"
              onClick={() => toast.error("This feature isn't available on 1 April, sorry.")}
              {...props}
            >
              <LucideStore class="mr-2 size-3.5 stroke-[1.5px]" />
              Lolzteam Market
            </DropdownMenuItem>
          </Show>
          <DropdownMenuItem
            class="py-1 text-xs"
            onClick={() => setShowImportTdata(true)}
            {...props}
          >
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

      <BotTokenImportDialog
        open={showImportBotToken()}
        onClose={() => setShowImportBotToken(false)}
      />

      <TdataImportDialog
        open={showImportTdata()}
        onClose={() => setShowImportTdata(false)}
      />
    </>
  )
}
