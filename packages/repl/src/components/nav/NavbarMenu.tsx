import type { ConfigColorMode, MaybeConfigColorMode } from '@kobalte/core'
import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import { useColorMode } from '@kobalte/core'
import { LucideCheck, LucideChevronRight, LucideExternalLink, LucideLaptop, LucideLogIn, LucideMoon, LucideSun, LucideUsers } from 'lucide-solid'
import { SiGithub } from 'solid-icons/si'
import { createSignal, For, Show } from 'solid-js'
import { Button } from '../../lib/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../lib/components/ui/dropdown-menu.tsx'
import { cn } from '../../lib/utils.ts'
import { $accounts, $activeAccount, $activeAccountId } from '../../store/accounts.ts'
import { useStore } from '../../store/use-store.ts'
import { AccountAvatar } from '../AccountAvatar.tsx'

export function NavbarMenu(props: {
  onShowAccounts: () => void
  onShowSettings: () => void
}) {
  const { setColorMode } = useColorMode()
  const [localColorMode, setLocalColorMode] = createSignal(localStorage.getItem('kb-color-mode') as MaybeConfigColorMode)
  const activeAccount = useStore($activeAccount)
  const accounts = useStore($accounts)

  // See: https://github.com/kobaltedev/kobalte/issues/543
  function updateColorMode(mode: ConfigColorMode) {
    setLocalColorMode(mode)
    setColorMode(mode)
  }

  return (
    <Show
      when={activeAccount() != null}
      fallback={(
        <Button
          variant="ghost"
          size="icon"
          class="w-auto px-2"
          onClick={props.onShowAccounts}
        >
          <LucideLogIn class="mr-2 size-4 shrink-0" />
          Log in
        </Button>
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          as={(props: DropdownMenuTriggerProps) => (
            <Button
              class="px-3"
              variant="ghost"
              {...props}
            >
              <span class="mr-3 max-w-[120px] truncate">
                {activeAccount()!.name}
              </span>
              <AccountAvatar class="size-6" account={activeAccount()!} />
            </Button>
          )}
        />
        <DropdownMenuContent class="w-[200px]">
          <DropdownMenuGroup>
            <DropdownMenuGroupLabel>Accounts</DropdownMenuGroupLabel>
            <For each={accounts()}>
              {account => (
                <DropdownMenuItem onClick={() => $activeAccountId.set(account.id)}>
                  <AccountAvatar
                    class={cn(
                      'size-4',
                      account.id !== activeAccount()?.id && 'opacity-50',
                    )}
                    account={account}
                  />
                  <span
                    class="ml-2"
                  >
                    {account.name}
                  </span>
                  {account.id === activeAccount()?.id && <LucideCheck class="ml-auto size-4" />}
                </DropdownMenuItem>
              )}
            </For>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={props.onShowAccounts}>
              <LucideUsers class="mr-2 size-4" />
              Manage accounts
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger class="flex items-center justify-between">
                <div class="flex flex-row items-center">
                  <LucideSun class="mr-2 size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <LucideMoon class="absolute mr-2 size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  Theme
                </div>
                <LucideChevronRight class="size-4" />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-[128px]">
                <DropdownMenuItem onSelect={() => updateColorMode('light')}>
                  <div class="flex w-full items-center justify-between">
                    <div class="flex flex-row items-center">
                      <LucideSun class="mr-2 size-4" />
                      <span>Light</span>
                    </div>
                    <div>
                      <LucideCheck class={cn('ml-auto size-4', localColorMode() !== 'light' && 'hidden')} />
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => updateColorMode('dark')}>
                  <div class="flex w-full items-center justify-between">
                    <div class="flex flex-row items-center">
                      <LucideMoon class="mr-2 size-4" />
                      <span>Dark</span>
                    </div>
                    <div>
                      <LucideCheck class={cn('ml-auto size-4', localColorMode() !== 'dark' && 'hidden')} />
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => updateColorMode('system')}>
                  <div class="flex w-full items-center justify-between">
                    <div class="flex flex-row items-center">
                      <LucideLaptop class="mr-2 size-4" />
                      <span>System</span>
                    </div>
                    <div>
                      <LucideCheck class={cn('ml-auto size-4', localColorMode() !== 'system' && 'hidden')} />
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              as="a"
              class="cursor-pointer"
              href="https://github.com/mtcute/repl"
              target="_blank"
            >
              <SiGithub class="mr-2 size-4" />
              GitHub
              <LucideExternalLink class="ml-auto size-4" />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Show>
  )
}
