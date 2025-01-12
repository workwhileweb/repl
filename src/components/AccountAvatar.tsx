import type { TelegramAccount } from '../store/accounts.ts'
import { Avatar, AvatarFallback, AvatarImage, makeAvatarFallbackText } from '../lib/components/ui/avatar.tsx'

export function AccountAvatar(props: {
  class?: string
  account: TelegramAccount
}) {
  return (
    <Avatar class={props.class}>
      <AvatarImage src={`/sw/avatar/${props.account.id}/avatar.jpg`} />
      <AvatarFallback>{makeAvatarFallbackText(props.account.name)}</AvatarFallback>
    </Avatar>
  )
}
