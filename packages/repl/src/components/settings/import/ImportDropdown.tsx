import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import type { StringSessionLibName } from 'mtcute-repl-worker/client'
import { LucideBot, LucideChevronRight, LucideDownload, LucideKeyRound, LucideLaptop, LucideTextCursorInput } from 'lucide-solid'
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
import { WithTooltip } from '../../../lib/components/ui/tooltip.tsx'
import { cn } from '../../../lib/utils.ts'
import { AuthKeyImportDialog } from './AuthKeyImportDialog.tsx'
import { BotTokenImportDialog } from './BotTokenImportDialog.tsx'
import { StringSessionDefs, StringSessionImportDialog } from './StringSessionImportDialog.tsx'
import { TDATA_IMPORT_AVAILABLE, TdataImportDialog } from './tdata/TdataImportDialog.tsx'

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
          <WithTooltip
            enabled={!TDATA_IMPORT_AVAILABLE}
            content={(
              <>
                Importing tdata is not supported in your browser.
                <br />
                Try using a Chromium-based browser instead.
              </>
            )}
          >
            {(props: DropdownMenuTriggerProps) => (
              <DropdownMenuItem
                class={cn('py-1 text-xs', !TDATA_IMPORT_AVAILABLE && 'opacity-50')}
                onClick={() => setShowImportTdata(true)}
                {...props}
              >
                <LucideLaptop class="mr-2 size-3.5 stroke-[1.5px]" />
                Desktop (tdata)
              </DropdownMenuItem>
            )}
          </WithTooltip>
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
