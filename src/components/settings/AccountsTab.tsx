import type { BaseTelegramClient, User } from '@mtcute/web'
import type { TelegramAccount } from '../../store/accounts.ts'
import type { LoginStep, StepContext } from '../login/Login.tsx'
import { timers } from '@fuman/utils'
import {
  LucideBot,
  LucideEllipsis,
  LucideLogIn,
  LucidePlus,
  LucideSearch,
  LucideTrash,
  LucideUser,
  LucideX,
} from 'lucide-solid'
import { nanoid } from 'nanoid'
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js'
import { Badge } from '../../lib/components/ui/badge.tsx'
import { Button } from '../../lib/components/ui/button.tsx'
import { Dialog, DialogContent } from '../../lib/components/ui/dialog.tsx'

import { TextField, TextFieldFrame, TextFieldRoot } from '../../lib/components/ui/text-field.tsx'
import { createInternalClient, deleteAccount } from '../../lib/telegram.ts'
import { cn } from '../../lib/utils.ts'
import { $accounts, $activeAccountId } from '../../store/accounts.ts'
import { useStore } from '../../store/use-store.ts'
import { AccountAvatar } from '../AccountAvatar.tsx'
import { LoginForm } from '../login/Login.tsx'
import { ImportDropdown } from './import/ImportDropdown.tsx'

function AddAccountDialog(props: {
  show: boolean
  testMode: boolean
  onClose: () => void
  onAccountCreated: (accountId: string, user: User, dcId: number) => void
}) {
  const [client, setClient] = createSignal<BaseTelegramClient | undefined>(undefined)

  let accountId: string
  let closeTimeout: timers.Timer | undefined
  let finished = false

  function handleOpenChange(open: boolean) {
    if (open) {
      finished = false
    } else {
      props.onClose()
      client()?.close()
      timers.clearTimeout(closeTimeout)
    }
  }

  async function handleStepChange(step: LoginStep, ctx: Partial<StepContext>) {
    if (step === 'done') {
      finished = true
      const client_ = client()!
      const dcs = await client_.mt.storage.dcs.fetch()
      props.onAccountCreated?.(accountId, ctx.done!.user, dcs?.main.id ?? 2)
      closeTimeout = timers.setTimeout(() => {
        props.onClose()
        client_.close()
      }, 2500)
    }
  }

  createEffect(on(() => props.show, async (show) => {
    if (!show) {
      if (!finished && accountId) {
        await client()?.close()
        await deleteAccount(accountId)
      }
    }

    accountId = nanoid()
    setClient(createInternalClient(accountId, props.testMode))
  }))

  onCleanup(() => {
    timers.clearTimeout(closeTimeout)
    client()?.close()
  })

  return (
    <Dialog
      open={props.show}
      onOpenChange={handleOpenChange}
    >
      <DialogContent>
        {props.testMode && (
          <Badge class="absolute left-4 top-4" variant="secondary">
            Test server
          </Badge>
        )}
        <div class="flex h-[420px] flex-col justify-center">
          {client() && (
            <LoginForm
              client={client()!}
              onStepChange={handleStepChange}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AccountRow(props: {
  account: TelegramAccount
  active: boolean
  onSetActive: () => void
}) {
  return (
    <div class="flex max-w-full flex-row overflow-hidden rounded-md border border-border p-2">
      <AccountAvatar
        class="mr-2 size-9 rounded-sm shadow-sm"
        account={props.account}
      />
      <div class="flex max-w-full flex-col overflow-hidden">
        <div class="flex items-center gap-1 truncate text-sm font-medium">
          {props.account.bot ? <LucideBot class="size-4 shrink-0" /> : <LucideUser class="size-4 shrink-0" />}
          {props.account.name}
          {props.account.testMode && (
            <Badge class="h-4 text-xs font-normal" variant="secondary">
              Test server
            </Badge>
          )}
          {props.active && (
            <Badge
              size="sm"
              variant="secondary"
              class="ml-1"
            >
              Active
            </Badge>
          )}
        </div>
        <div class="flex items-center text-xs text-muted-foreground">
          ID:
          {' '}
          {props.account.telegramId}
          {' • '}
          DC:
          {' '}
          {props.account.dcId}
        </div>
      </div>
      <div class="flex-1" />
      <div class="mr-1 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
        >
          <LucideEllipsis class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          disabled={props.active}
          onClick={props.onSetActive}
        >
          <LucideLogIn class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-8 hover:bg-error"
        >
          <LucideTrash class="size-4 text-error-foreground" />
        </Button>
      </div>
    </div>
  )
}

export function AccountsTab() {
  const accounts = useStore($accounts)
  const activeAccountId = useStore($activeAccountId)
  const [showAddAccount, setShowAddAccount] = createSignal(false)
  const [addAccountTestMode, setAddAccountTestMode] = createSignal(false)

  const [searchQuery, setSearchQuery] = createSignal('')

  function handleAddAccount(e: MouseEvent) {
    setShowAddAccount(true)
    setAddAccountTestMode(e.ctrlKey || e.metaKey)
  }

  function handleAccountCreated(accountId: string, user: User, dcId: number) {
    $accounts.set([
      ...$accounts.get(),
      {
        id: accountId,
        name: user.displayName,
        telegramId: user.id,
        bot: user.isBot,
        testMode: addAccountTestMode(),
        dcId,
      },
    ])
    $activeAccountId.set(accountId)
  }

  const filteredAccounts = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    if (query === '') {
      return accounts()
    }

    return accounts().filter((account) => {
      return account.name.toLowerCase().includes(query) || account.telegramId.toString().includes(query)
    })
  })

  return (
    <>
      <Show
        when={accounts().length !== 0}
        fallback={(
          <div class="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            No accounts yet
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAccount}
            >
              <LucidePlus class="mr-2 size-4" />
              Log in
            </Button>
          </div>

        )}
      >
        <div class="max-w-full overflow-hidden p-2">
          <div class="mb-2 flex h-8 items-center gap-2">
            <TextFieldRoot>
              <TextFieldFrame class="h-7 items-center shadow-none">
                <LucideSearch class="mr-2 size-3 shrink-0 text-muted-foreground" />
                <TextField
                  placeholder="Search"
                  value={searchQuery()}
                  onInput={e => setSearchQuery(e.currentTarget.value)}
                />
                <LucideX
                  class={cn(
                    'shrink-0 text-muted-foreground size-3 cursor-pointer hover:text-foreground',
                    searchQuery() === '' && 'opacity-0 pointer-events-none',
                  )}
                  onClick={() => setSearchQuery('')}
                />
              </TextFieldFrame>
            </TextFieldRoot>

            <Button
              variant="outline"
              size="xs"
              onClick={handleAddAccount}
            >
              <LucidePlus class="mr-2 size-3" />
              Log in
            </Button>

            <ImportDropdown />
          </div>
          <div class="flex max-w-full flex-col gap-1 overflow-hidden">
            <For each={filteredAccounts()}>
              {account => (
                <AccountRow
                  account={account}
                  active={account.id === activeAccountId()}
                  onSetActive={() => $activeAccountId.set(account.id)}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      <AddAccountDialog
        show={showAddAccount()}
        testMode={addAccountTestMode()}
        onClose={() => setShowAddAccount(false)}
        onAccountCreated={handleAccountCreated}
      />
    </>
  )
}
