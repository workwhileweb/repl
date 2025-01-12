import { createEffect, createSignal, onCleanup } from 'solid-js'
import { cn } from '../../lib/utils.ts'

const HTML = `
  <!DOCTYPE html>
  <html lang="en">
  <meta charset="utf-8">
  <title>DevTools</title>
  <meta name="referrer" content="no-referrer">
  <script src="https://unpkg.com/@ungap/custom-elements/es.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.12.3/public/front_end/entrypoints/chii_app/chii_app.js"></script>
  <body class="undocked" id="-blink-dev-tools">
`

const INJECTED_SCRIPT = `
async function waitForElement(selector, container) {
  let tabbedPane;
  while(!tabbedPane) {
    tabbedPane = container.querySelector(selector);
    if (!tabbedPane) await new Promise(resolve => setTimeout(resolve, 50));
  }
  return tabbedPane;
}

function hideBySelector(root, selector) {
  const el = root.shadowRoot.querySelector(selector);
  if (!el) return;
  el.style.display = 'none';
}

function focusConsole(tabbedPane) {
  const consoleTab = tabbedPane.shadowRoot.querySelector('#tab-console');

  // tabs get focused on mousedown instead of click
  consoleTab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  consoleTab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

(async ()=> {
  const tabbedPane = await waitForElement('.tabbed-pane', document.body);
  focusConsole(tabbedPane);
  hideBySelector(tabbedPane, '.tabbed-pane-header');

  const consoleToolbar = await waitForElement('.console-main-toolbar', document.body);
  hideBySelector(consoleToolbar, 'devtools-issue-counter');
})();
`

export function Devtools(props: {
  class?: string
  iframeRef?: (el: HTMLIFrameElement) => void
}) {
  const [innerRef, setInnerRef] = createSignal<HTMLIFrameElement | undefined>()

  const url = URL.createObjectURL(new Blob([HTML], { type: 'text/html' }))
  onCleanup(() => URL.revokeObjectURL(url))

  createEffect(() => {
    const _innerRef = innerRef()
    if (_innerRef) {
      props.iframeRef?.(_innerRef)
    }
  })

  function handleLoad() {
    const _innerRef = innerRef()
    if (!_innerRef) return
    const script = document.createElement('script')
    script.textContent = INJECTED_SCRIPT
    _innerRef.contentWindow?.document.body.appendChild(script)
  }

  return (
    <div class={cn('relative', props.class)}>
      <iframe
        ref={setInnerRef}
        src={`${url}#?embedded=${encodeURIComponent(location.origin)}`}
        title="Devtools"
        class="absolute inset-0 block size-full"
        onLoad={handleLoad}
      />
    </div>
  )
}
