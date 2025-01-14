import clsx from 'clsx'
import { onMount } from 'solid-js'

const HAS_NATIVE_EMOJI = navigator.userAgent.includes('Apple')
const EMOJI_POLYFILL_FONT = 'https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1/dist/TwemojiCountryFlags.woff2'

let hasAddedEmojiFont = false

export function CountryIcon(props: { class?: string, country: string }) {
  onMount(() => {
    if (HAS_NATIVE_EMOJI) return

    if (!hasAddedEmojiFont) {
      hasAddedEmojiFont = true
      const style = document.createElement('style')
      style.innerHTML = `
        @font-face {
          unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
          font-family: 'TwemojiCountries';
          font-display: swap;
          src: url('${EMOJI_POLYFILL_FONT}') format('woff2');
        }
      `
      document.head.appendChild(style)
    }
  })

  const emoji = () => {
    const upper = props.country.toUpperCase()
    if (upper === 'FT') return '🏴‍☠️'
    let res = ''
    for (let i = 0; i < upper.length; i++) {
      res += String.fromCodePoint(0x1F1E6 + upper.charCodeAt(i) - 'A'.charCodeAt(0))
    }
    return res
  }

  return (
    <span
      class={clsx(
        'font-[TwemojiCountries]',
        props.class,
      )}
    >
      {emoji()}
    </span>
  )
}
