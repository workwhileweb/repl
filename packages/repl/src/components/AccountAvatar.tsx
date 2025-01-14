import { type TelegramAccount, workerInvoke } from 'mtcute-repl-worker/client'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { Avatar, AvatarFallback, AvatarImage, makeAvatarFallbackText } from '../lib/components/ui/avatar.tsx'

export function AccountAvatar(props: {
  class?: string
  account: TelegramAccount
}) {
  const [url, setUrl] = createSignal<string | undefined>()
  onMount(async () => {
    try {
      const buf = await workerInvoke('telegram', 'fetchAvatar', props.account.id)
      if (!buf) return

      const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }))
      setUrl(url)
    } catch (e) {
      console.error(e)
    }
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
