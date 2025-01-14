import type { TelegramAccount } from 'mtcute-repl-worker/client'
import type { LoginStep } from './login/Login.tsx'
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
import { workerInvoke } from 'mtcute-repl-worker/client'
import { nanoid } from 'nanoid'
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js'
import { Badge } from '../../lib/components/ui/badge.tsx'

import { Button } from '../../lib/components/ui/button.tsx'
import { Dialog, DialogContent } from '../../lib/components/ui/dialog.tsx'
import { TextField, TextFieldFrame, TextFieldRoot } from '../../lib/components/ui/text-field.tsx'
import { cn } from '../../lib/utils.ts'
import { $accounts, $activeAccountId } from '../../store/accounts.ts'
import { useStore } from '../../store/use-store.ts'
import { AccountAvatar } from '../AccountAvatar.tsx'
import { ImportDropdown } from './import/ImportDropdown.tsx'
import { LoginForm } from './login/Login.tsx'

function AddAccountDialog(props: {
  show: boolean
  testMode: boolean
  onClose: () => void
  // onAccountCreated: (accountId: string, user: User, dcId: number) => void
}) {
  const [accountId, setAccountId] = createSignal<string | undefined>(undefined)
  let closeTimeout: timers.Timer | undefined
  let finished = false

  function handleOpenChange(open: boolean) {
    if (open) {
      finished = false
    } else {
      props.onClose()
      // client()?.close()
      timers.clearTimeout(closeTimeout)
    }
  }

  async function handleStepChange(step: LoginStep) {
    if (step === 'done') {
      finished = true
      closeTimeout = timers.setTimeout(() => {
        props.onClose()
        workerInvoke('telegram', 'disposeClient', { accountId: accountId()! })
      }, 2500)
    }
  }

  createEffect(on(() => props.show, async (show) => {
    if (!show) {
      if (!finished && accountId()) {
        await workerInvoke('telegram', 'disposeClient', {
          accountId: accountId()!,
          forget: true,
        })
      }
    }

    finished = false
    setAccountId(nanoid())
    await workerInvoke('telegram', 'createClient', {
      accountId: accountId()!,
      testMode: props.testMode,
    })
  }))

  onCleanup(() => {
    timers.clearTimeout(closeTimeout)
    if (accountId()) {
      workerInvoke('telegram', 'disposeClient', {
        accountId: accountId()!,
        forget: !finished,
      })
    }
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
          <Show when={accountId()}>
            <LoginForm
              accountId={accountId()!}
              onStepChange={handleStepChange}
            />
          </Show>
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
          variant="ghostDestructive"
          size="icon"
          class="size-8"
        >
          <LucideTrash class="size-4" />
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
            <div class="flex flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAccount}
              >
                <LucidePlus class="mr-2 size-4" />
                Log in
              </Button>
              <ImportDropdown size="sm" />
            </div>
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

            <ImportDropdown size="xs" />
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
      />
    </>
  )
}
