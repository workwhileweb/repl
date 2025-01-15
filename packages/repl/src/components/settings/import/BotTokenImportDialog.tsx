import { workerInvoke } from 'mtcute-repl-worker/client'
import { createEffect, createSignal, on } from 'solid-js'
import { Button } from '../../../lib/components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '../../../lib/components/ui/dialog.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'

export function BotTokenImportDialog(props: {
  open: boolean
  onClose: () => void
}) {
  const [botToken, setBotToken] = createSignal('')
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)

  let abortController: AbortController | undefined
  const handleSubmit = async () => {
    abortController?.abort()
    abortController = new AbortController()
    setLoading(true)

    try {
      await workerInvoke('telegram', 'importBotToken', {
        botToken: botToken(),
        abortSignal: abortController.signal,
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
          Log in with bot token
        </DialogHeader>
        <DialogDescription>
          <TextFieldRoot validationState={error() ? 'invalid' : 'valid'}>
            <TextFieldLabel class="text-foreground">
              Bot token
            </TextFieldLabel>
            <TextFieldFrame>
              <TextField
                class="w-full"
                value={botToken()}
                onInput={e => setBotToken(e.currentTarget.value)}
                disabled={loading()}
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
