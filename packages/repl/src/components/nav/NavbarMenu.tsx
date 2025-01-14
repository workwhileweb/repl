import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import { LucideCheck, LucideChevronDown, LucideExternalLink, LucideLogIn, LucideSettings, LucideUsers } from 'lucide-solid'
import { SiGithub } from 'solid-icons/si'
import { For, Show } from 'solid-js'
import { Button } from '../../lib/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const activeAccount = useStore($activeAccount)
  const accounts = useStore($accounts)

  return (
    <Show
      when={activeAccount() != null}
      fallback={(
        <Button
          variant="ghost"
          size="icon"
          class="ml-auto w-auto px-2"
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
              class="z-10 ml-auto px-2"
              variant="ghost"
              {...props}
            >
              <AccountAvatar class="size-6" account={activeAccount()!} />
              <span class="ml-2 max-w-[120px] truncate">
                {activeAccount()!.name}
              </span>
              <LucideChevronDown class="ml-2 size-4" />
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
                    class={cn(
                      'ml-2',
                      account.id === activeAccount()?.id ? 'font-semibold' : 'text-muted-foreground',
                    )}
                  >
                    {account.name}
                  </span>
                  {account.id === activeAccount()?.id && <LucideCheck class="ml-auto size-4" />}
                </DropdownMenuItem>
              )}
            </For>
            <DropdownMenuItem onClick={props.onShowAccounts}>
              <LucideUsers class="mr-2 size-4" />
              Manage accounts
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={props.onShowSettings}>
              <LucideSettings class="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
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
