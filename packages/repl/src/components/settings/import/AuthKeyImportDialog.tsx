import { hex } from '@fuman/utils'
import { createEffect, createSignal, on } from 'solid-js'
import { Button } from '../../../lib/components/ui/button.tsx'
import { Checkbox, CheckboxControl, CheckboxLabel } from '../../../lib/components/ui/checkbox.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '../../../lib/components/ui/dialog.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'
import { $accounts } from '../../../store/accounts.ts'

export function AuthKeyImportDialog(props: {
  open: boolean
  onClose: () => void
}) {
  const [authKeyInputRef, setAuthKeyInputRef] = createSignal<HTMLTextAreaElement | undefined>()
  const [dcId, setDcId] = createSignal<string>('2')
  const [testMode, setTestMode] = createSignal(false)
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)

  let abortController: AbortController | undefined
  const handleSubmit = async () => {
    if (!['1', '2', '4', '5'].includes(dcId())) {
      setError('Invalid datacenter ID (must be 1, 2, 4 or 5)')
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    setLoading(true)

    const oldAccounts = $accounts.get()

    try {
      const testMode_ = testMode()
      const authKey = hex.decode(authKeyInputRef()!.value)
      if (authKey.length !== 256) {
        setError('Invalid auth key (must be 256 bytes long)')
        setLoading(false)
        return
      }

      const session: InputStringSessionData = {
        authKey: hex.decode(authKeyInputRef()!.value),
        testMode: testMode_,
        primaryDcs: (testMode_ ? DC_MAPPING_TEST : DC_MAPPING_PROD)[Number(dcId())],
      }
      const account = await importAccount(session, abortController.signal)

      // check if account already exists
      if (oldAccounts.some(it => it.telegramId === account.telegramId)) {
        deleteAccount(account.id)
        setError(`Account already exists (user ID: ${account.telegramId})`)
        setLoading(false)
        return
      }

      $accounts.set([
        ...$accounts.get(),
        account,
      ])
      props.onClose()
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        console.error(e)
        setError('Unknown error')
      }
    }

    setLoading(false)
  }
  createEffect(on(() => props.open, (open) => {
    if (!open) {
      abortController?.abort()
      setLoading(false)
      abortController = undefined
      setError(undefined)
    }
  }))

  return (
    <Dialog
      open={props.open}
      onOpenChange={open => !open && props.onClose()}
    >
      <DialogContent>
        <DialogHeader>
          Import auth key
        </DialogHeader>
        <DialogDescription>
          <TextFieldRoot>
            <TextFieldLabel class="text-foreground">
              Datacenter ID
            </TextFieldLabel>
            <TextFieldFrame>
              <TextField
                class="w-full"
                value={dcId()}
                onInput={e => setDcId(e.currentTarget.value.replace(/\D/g, ''))}
              />
            </TextFieldFrame>
          </TextFieldRoot>

          <TextFieldRoot class="mt-2" validationState={error() ? 'invalid' : 'valid'}>
            <TextFieldLabel class="flex flex-row items-center justify-between text-foreground">
              Hex-encoded auth key
              <a
                href="#"
                class="text-xs font-normal text-muted-foreground hover:text-neutral-900"
                onClick={() => {
                  navigator.clipboard.readText().then((text) => {
                    const input = authKeyInputRef()!
                    input.value = text
                    input.focus()
                  })
                }}
              >
                paste
              </a>
            </TextFieldLabel>
            <TextFieldFrame class="h-auto">
              <TextField
                class="size-full h-40 resize-none font-mono"
                as="textarea"
                ref={setAuthKeyInputRef}
                onInput={() => setError(undefined)}
              />
            </TextFieldFrame>
            <TextFieldErrorMessage>
              {error()}
            </TextFieldErrorMessage>
          </TextFieldRoot>

          <Checkbox
            class="mt-2 flex flex-row items-center gap-2"
            checked={testMode()}
            onChange={setTestMode}
          >
            <CheckboxControl />
            <CheckboxLabel class="text-foreground">
              Use test servers
            </CheckboxLabel>
          </Checkbox>

          <Button
            class="mt-6 w-full"
            size="sm"
            onClick={handleSubmit}
            disabled={loading()}
          >
            {loading() ? 'Checking...' : 'Import'}
          </Button>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
