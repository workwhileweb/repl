import type { Tdata } from '@mtcute/convert'
import { hex } from '@fuman/utils'
import { workerInvoke } from 'mtcute-repl-worker/client'
import { createEffect, createSignal, For, on, Show } from 'solid-js'
import { Button } from '../../../../lib/components/ui/button.tsx'
import { Checkbox, CheckboxControl, CheckboxLabel } from '../../../../lib/components/ui/checkbox.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '../../../../lib/components/ui/dialog.tsx'
import { Spinner } from '../../../../lib/components/ui/spinner.tsx'
import { $accounts } from '../../../../store/accounts.ts'

interface TdataAccount {
  telegramId: number
  index: number
  authKey: Uint8Array
  dcId: number
  toImport: boolean
}

export function TdataImportDialog(props: {
  open: boolean
  onClose: () => void
}) {
  const [reading, setReading] = createSignal(true)
  const [accounts, setAccounts] = createSignal<TdataAccount[]>([])
  const [error, setError] = createSignal<string | undefined>('')
  const [loading, setLoading] = createSignal(false)

  const accountExists = (id: number) => $accounts.get()?.some(it => it.telegramId === id)

  let abortController: AbortController | undefined
  const handleSubmit = async () => {
    abortController?.abort()
    abortController = new AbortController()
    setLoading(true)

    const errors: string[] = []
    for (const account of accounts()) {
      if (!account.toImport) continue
      try {
        await workerInvoke('telegram', 'importAuthKey', {
          // todo: idk if there is a point in using hex here
          hexAuthKey: hex.encode(account.authKey),
          dcId: account.dcId,
          testMode: false,
          abortSignal: abortController.signal,
        })
      } catch (e) {
        if (e instanceof Error) {
          errors.push(`Failed to import ${account.telegramId}: ${e.message}`)
        } else {
          console.error(e)
          errors.push('Unknown error')
        }
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }

    setError(undefined)
    setLoading(false)
    props.onClose()
  }

  createEffect(on(() => props.open, (open) => {
    if (!open) {
      abortController?.abort()
      setLoading(false)
      abortController = undefined
      setError(undefined)
      return
    }

    setReading(true)

    ;(async () => {
      let tdata: Tdata | undefined
      const importPromise = import('./tdata-web.ts')
      if ('showDirectoryPicker' in window) {
        // use the native fs api

        const handle = await (window as any).showDirectoryPicker({
          id: 'mtcute-repl-tdata-import',
          mode: 'read',
          startIn: 'documents',
        }).catch((e: any) => {
          if (!(e instanceof DOMException && e.name === 'AbortError')) {
            throw e
          }
        })
        if (!handle) return props.onClose()

        const { Tdata, WebFsInterface, WebExtCryptoProvider } = await importPromise
        tdata = await Tdata.open({
          path: '',
          fs: new WebFsInterface(handle),
          crypto: new WebExtCryptoProvider(),
          ignoreVersion: true,
        })
      } else {
        // use non-standard but widely supported webkitdirectory api
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.multiple = true

        input.style.position = 'fixed'
        input.style.top = '-100000px'
        input.style.left = '-100000px'
        document.body.appendChild(input)

        const files = await new Promise<File[] | null>((resolve) => {
          input.addEventListener('change', () => {
            const files = Array.from(input.files ?? [])
            input.remove()
            resolve(files)
          })
          input.addEventListener('cancel', () => {
            input.remove()
            resolve(null)
          })
          input.click()
        })

        if (!files) return props.onClose()

        const rootName = files[0].webkitRelativePath.split('/')[0]

        const { Tdata, WebkitFsInterface, WebExtCryptoProvider } = await importPromise

        tdata = await Tdata.open({
          path: rootName,
          fs: new WebkitFsInterface(files),
          crypto: new WebExtCryptoProvider(),
          ignoreVersion: true,
        })
      }

      const keyData = await tdata.readKeyData()
      const accounts: TdataAccount[] = []
      for (const idx of keyData.order) {
        const mtp = await tdata.readMtpAuthorization(idx)
        accounts.push({
          telegramId: mtp.userId.toNumber(),
          index: idx,
          authKey: mtp.authKeys.find(it => it.dcId === mtp.mainDcId)!.key,
          dcId: mtp.mainDcId,
          toImport: !accountExists(mtp.userId.toNumber()),
        })
      }

      setAccounts(accounts)
      setReading(false)
    })().catch((e) => {
      setReading(false)
      console.error(e)
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Unknown error')
      }
    })
  }))

  return (
    <Dialog
      open={props.open}
      onOpenChange={open => !open && props.onClose()}
    >
      <DialogContent class="max-w-[400px] gap-2">
        <DialogHeader>
          {reading() || error() ? 'Import tdata' : (
            <>
              Found
              {' '}
              {accounts().length}
              {' '}
              account
              {accounts().length === 1 ? '' : 's'}
            </>
          )}
        </DialogHeader>
        <DialogDescription>
          <Show
            when={!reading()}
            fallback={(
              <div class="flex w-full items-center justify-center">
                <Spinner indeterminate class="m-4 size-8" />
              </div>
            )}
          >
            <For each={accounts()}>
              {account => (
                <Checkbox
                  class="ml-1 flex flex-row items-center gap-2"
                  checked={account.toImport}
                  onChange={checked => setAccounts(
                    accounts().map(it => it.index === account.index ? {
                      ...it,
                      toImport: checked,
                    } : it),
                  )}
                  disabled={accountExists(account.telegramId)}
                >
                  <CheckboxControl />
                  <CheckboxLabel class="flex items-center gap-1 text-sm">
                    <div class="text-foreground">
                      ID
                      {' '}
                      {account.telegramId}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      (DC
                      {' '}
                      {account.dcId}
                      , index
                      {' '}
                      {account.index}
                      )
                    </div>
                  </CheckboxLabel>
                </Checkbox>
              )}
            </For>
            {error() && (
              <div class="mt-2 text-sm text-error-foreground">
                {error()}
              </div>
            )}
          </Show>

          <Button
            class="mt-4 w-full"
            size="sm"
            onClick={handleSubmit}
            disabled={loading() || reading() || accounts().filter(it => it.toImport).length === 0}
          >
            {loading() ? 'Checking...' : 'Import'}
          </Button>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
