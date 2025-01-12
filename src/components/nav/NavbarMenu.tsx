import type { DropdownMenuTriggerProps } from '@kobalte/core/dropdown-menu'
import { ChevronDownIcon, ExternalLinkIcon, LucideCheck, SettingsIcon, UsersIcon } from 'lucide-solid'
import { SiGithub } from 'solid-icons/si'
import { For } from 'solid-js'
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
    <DropdownMenu>
      <DropdownMenuTrigger
        as={(props: DropdownMenuTriggerProps) => (
          <Button
            class="z-10 ml-auto px-2"
            variant="ghost"
            {...props}
          >
            {activeAccount() != null && (
              <>
                <AccountAvatar class="size-6" account={activeAccount()!} />
                <span class="ml-2 max-w-[120px] truncate">
                  {activeAccount()!.name}
                </span>
                <ChevronDownIcon class="ml-2 size-4" />
              </>
            )}
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
            <UsersIcon class="mr-2 size-4" />
            Manage accounts
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={props.onShowSettings}>
            <SettingsIcon class="mr-2 size-4" />
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
            <ExternalLinkIcon class="ml-auto size-4" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
