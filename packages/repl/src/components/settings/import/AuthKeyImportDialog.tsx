import { workerInvoke } from 'mtcute-repl-worker/client'
import { createEffect, createSignal, on, Show } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { Button } from '../../../lib/components/ui/button.tsx'
import { Checkbox, CheckboxControl, CheckboxLabel } from '../../../lib/components/ui/checkbox.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '../../../lib/components/ui/dialog.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'
import { CustomApiForm, useCustomApiFormState } from '../login/CustomApiDialog.tsx'

export function AuthKeyImportDialog(props: {
  open: boolean
  onClose: () => void
}) {
  const [authKeyInputRef, setAuthKeyInputRef] = createSignal<HTMLTextAreaElement | undefined>()
  const [dcId, setDcId] = createSignal<string>('2')
  const [testMode, setTestMode] = createSignal(false)
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)

  const [useCustomApi, setUseCustomApi] = createSignal(false)
  const [customApi, setCustomApi] = useCustomApiFormState()

  let abortController: AbortController | undefined
  const handleSubmit = async () => {
    if (!['1', '2', '4', '5'].includes(dcId())) {
      setError('Invalid datacenter ID (must be 1, 2, 4 or 5)')
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    setLoading(true)

    try {
      await workerInvoke('telegram', 'importAuthKey', {
        hexAuthKey: authKeyInputRef()!.value,
        dcId: Number(dcId()),
        testMode: testMode(),
        abortSignal: abortController.signal,
        apiOptions: useCustomApi() ? unwrap(customApi) : undefined,
      })

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
            <TextFieldLabel>
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
            <TextFieldLabel class="flex flex-row items-center justify-between">
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
                class="size-full h-20 resize-none font-mono"
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
            <CheckboxLabel>
              Use test servers
            </CheckboxLabel>
          </Checkbox>

          <Checkbox
            class="mt-2 flex flex-row items-center gap-2"
            checked={useCustomApi()}
            onChange={setUseCustomApi}
          >
            <CheckboxControl />
            <CheckboxLabel>
              Use custom connection options
            </CheckboxLabel>
          </Checkbox>

          <Show when={useCustomApi()}>
            <CustomApiForm
              class="mt-2"
              state={customApi}
              setState={setCustomApi}
            />
          </Show>

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
