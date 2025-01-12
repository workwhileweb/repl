import { createSignal } from 'solid-js'

export function Actions(props: {
  class?: string
  devtoolsIframe: HTMLIFrameElement | undefined
}) {
  const [running, setRunning] = createSignal(false)

  return (
    <div class={props.class}>

      {/* <iframe
        ref={setRunnerIframe}
        src="about:blank"
        class="size-full"
      /> */}
    </div>
  )
}
