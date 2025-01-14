import { createEffect, createSignal, on } from 'solid-js'
import { Button } from '../../../lib/components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '../../../lib/components/ui/dialog.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../lib/components/ui/select.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'
import { $accounts } from '../../../store/accounts.ts'

export type StringSessionLibName =
  | 'mtcute'
  | 'pyrogram'
  | 'telethon'
  | 'mtkruto'
  | 'gramjs'

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

// async function convert(libName: StringSessionLibName, session: string): Promise<StringSessionData> {
//   switch (libName) {
//     case 'mtcute': {
//       return readStringSession(session)
//     }
//     case 'telethon': {
//       const { convertFromTelethonSession } = await import('@mtcute/convert')
//       return convertFromTelethonSession(session)
//     }
//     case 'gramjs': {
//       const { convertFromGramjsSession } = await import('@mtcute/convert')
//       return convertFromGramjsSession(session)
//     }
//     case 'pyrogram': {
//       const { convertFromPyrogramSession } = await import('@mtcute/convert')
//       return convertFromPyrogramSession(session)
//     }
//     case 'mtkruto': {
//       const { convertFromMtkrutoSession } = await import('@mtcute/convert')
//       return convertFromMtkrutoSession(session)
//     }
//   }
// }

export function StringSessionImportDialog(props: {
  open: boolean
  onClose: () => void
  chosenLibName: StringSessionLibName
  onChosenLibName: (name: StringSessionLibName) => void
}) {
  const [inputRef, setInputRef] = createSignal<HTMLTextAreaElement | undefined>()
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)

  let abortController: AbortController | undefined
  const handleSubmit = async () => {
    abortController?.abort()
    abortController = new AbortController()
    setLoading(true)

    const oldAccounts = $accounts.get()

    try {
      const converted = await convert(props.chosenLibName, inputRef()!.value)

      // check if account exists
      if (converted.self && oldAccounts.some(it => it.telegramId === converted.self!.userId)) {
        setError(`Account already exists (user ID: ${converted.self!.userId})`)
        setLoading(false)
        return
      }

      const account = await importAccount(converted, abortController.signal)

      // check once again if account already exists
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
                class="size-full h-40 resize-none font-mono"
                as="textarea"
                ref={setInputRef}
                onInput={() => setError(undefined)}
              />
            </TextFieldFrame>
            <TextFieldErrorMessage>
              {error()}
            </TextFieldErrorMessage>
          </TextFieldRoot>

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
