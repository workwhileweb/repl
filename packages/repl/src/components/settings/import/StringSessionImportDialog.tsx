import { type StringSessionLibName, workerInvoke } from 'mtcute-repl-worker/client'
import { createEffect, createSignal, on, Show } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { Button } from '../../../lib/components/ui/button.tsx'
import { Checkbox, CheckboxControl, CheckboxLabel } from '../../../lib/components/ui/checkbox.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '../../../lib/components/ui/dialog.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../lib/components/ui/select.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'
import { CustomApiForm, useCustomApiFormState } from '../login/CustomApiDialog.tsx'

export const StringSessionDefs: {
  name: StringSessionLibName
  displayName: string
}[] = [
  { name: 'mtcute', displayName: 'mtcute' },
  { name: 'telethon', displayName: 'Telethon v1.x' },
  { name: 'gramjs', displayName: 'GramJS' },
  { name: 'pyrogram', displayName: 'Pyrogram' },
  { name: 'mtkruto', displayName: 'MTKruto' },
]

export function StringSessionImportDialog(props: {
  open: boolean
  onClose: () => void
  chosenLibName: StringSessionLibName
  onChosenLibName: (name: StringSessionLibName) => void
}) {
  const [inputRef, setInputRef] = createSignal<HTMLTextAreaElement | undefined>()
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)

  const [useCustomApi, setUseCustomApi] = createSignal(false)
  const [customApi, setCustomApi] = useCustomApiFormState()

  let abortController: AbortController | undefined
  const handleSubmit = async () => {
    abortController?.abort()
    abortController = new AbortController()
    setLoading(true)

    try {
      await workerInvoke('telegram', 'importStringSession', {
        libraryName: props.chosenLibName,
        session: inputRef()!.value,
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
          Import string session
        </DialogHeader>
        <DialogDescription>
          <div class="mb-1 font-medium text-primary">
            Library
          </div>
          <Select
            options={StringSessionDefs}
            optionValue="name"
            optionTextValue="displayName"
            value={StringSessionDefs.find(def => def.name === props.chosenLibName)}
            onChange={e => e && props.onChosenLibName(e.name)}
            itemComponent={props => <SelectItem item={props.item}>{props.item.rawValue.displayName}</SelectItem>}
          >
            <SelectTrigger>
              <SelectValue<typeof StringSessionDefs[number]>>
                {state => state.selectedOption()?.displayName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>

          <TextFieldRoot class="mt-4" validationState={error() ? 'invalid' : 'valid'}>
            <TextFieldLabel class="flex flex-row items-center justify-between text-foreground">
              Session string
              <a
                href="#"
                class="text-xs font-normal text-muted-foreground hover:text-neutral-900"
                onClick={() => {
                  navigator.clipboard.readText().then((text) => {
                    const input = inputRef()!
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
                ref={setInputRef}
                onInput={() => setError(undefined)}
              />
            </TextFieldFrame>
            <TextFieldErrorMessage>
              {error()}
            </TextFieldErrorMessage>
          </TextFieldRoot>

          <Checkbox
            class="mt-4 flex flex-row items-center gap-2"
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
