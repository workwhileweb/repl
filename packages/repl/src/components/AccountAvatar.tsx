import { type TelegramAccount, workerInvoke } from 'mtcute-repl-worker/client'
import { createEffect, createSignal, onCleanup, untrack } from 'solid-js'
import { Avatar, AvatarFallback, AvatarImage, makeAvatarFallbackText } from '../lib/components/ui/avatar.tsx'

export function AccountAvatar(props: {
  class?: string
  account: TelegramAccount
}) {
  const [url, setUrl] = createSignal<string | undefined>()
  createEffect(() => {
    const accountId = props.account.id
    if (!accountId) {
      return
    }

    if (untrack(url)) {
      URL.revokeObjectURL(untrack(url)!)
    }
    setUrl(undefined)

    ;(async () => {
      try {
        const buf = await workerInvoke('telegram', 'fetchAvatar', accountId)
        if (!buf) return

        const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }))
        setUrl(url)
      } catch (e) {
        console.error(e)
      }
    })()
  })
  onCleanup(() => url() && URL.revokeObjectURL(url()!))

  return (
    <Avatar class={props.class}>
      <AvatarImage src={url()} />
      <AvatarFallback class="whitespace-nowrap rounded-none">
        {makeAvatarFallbackText(props.account.name)}
      </AvatarFallback>
    </Avatar>
  )
}
