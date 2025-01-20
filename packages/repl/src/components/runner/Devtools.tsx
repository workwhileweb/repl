import { useColorMode } from '@kobalte/core'
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
  <script>
    if (window.location.hash.includes('dark=true')) {
      document.documentElement.style.colorScheme = 'dark'
    }
  </script>
  <style id="inject-css">
    :root {
      --sys-color-base-container: hsl(0 0% 100%);
      --sys-color-cdt-base: hsl(0 0% 100%);
      --sys-color-on-base-divider: hsl(240 5.9% 90%);
      --sys-color-divider: hsl(240 5.9% 90%);
      --sys-color-neutral-outline: hsl(240 5.9% 90%);
    }
    .-theme-with-dark-background {
      --sys-color-base-container: hsl(240 10% 3.9%);
      --sys-color-cdt-base: hsl(240 10% 3.9%);
      --sys-color-on-base-divider: hsl(240 3.7% 15.9%);
      --sys-color-divider: hsl(240 3.7% 15.9%);
      --sys-color-neutral-outline: hsl(240 3.7% 15.9%);
      --sys-color-on-surface-subtle: hsl(0 0 98%);
      --sys-color-state-hover-on-subtle: hsl(0 0% 98% / 0.08);
    }
  </style>
  <style id="inject-css-tab-pane">
    .tabbed-pane-header-tab {
      border-bottom: 2px solid transparent;
      border-left: 0;
      border-right: 0;
      display: flex;
      justify-content: center;
    }
    .tabbed-pane-header-tab.selected {
      color: var(--sys-color-on-surface-subtle);
      border-bottom: 2px solid var(--sys-color-on-surface-subtle);
      border-left: 0;
      border-right: 0;
    }
  </style>
`

const INJECTED_SCRIPT = `
async function waitForElement(selector, container, waitForShadowRoot = false) {
  let el;
  while(!el) {
    el = container.querySelector(selector);
    if (!el || (waitForShadowRoot && !el.shadowRoot)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return el;
}

function hideBySelector(root, selector) {
  const el = root.querySelector(selector);
  if (!el) return;
  el.style.display = 'none';
}
  
function hideBySelectorAll(root, selector) {
  const els = root.querySelectorAll(selector);
  for (const el of els) {
    el.style.display = 'none';
  }
}

async function focusConsole(tabbedPane) {
  const consoleTab = await waitForElement('#tab-console', tabbedPane.shadowRoot);

  // tabs get focused on mousedown instead of click
  consoleTab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  consoleTab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

(async () => {
  localStorage.setItem('disableSelfXssWarning', 'true')

  const tabbedPane = await waitForElement('.tabbed-pane', document.body);
  await focusConsole(tabbedPane);

  await waitForElement('.tabbed-pane-right-toolbar', tabbedPane.shadowRoot);
  hideBySelectorAll(tabbedPane.shadowRoot, '.tabbed-pane-left-toolbar, .tabbed-pane-right-toolbar, .tabbed-pane-tab-slider');
  hideBySelectorAll(tabbedPane.shadowRoot, '.tabbed-pane-header-tab:not(#tab-console, #tab-sources)');
  tabbedPane.shadowRoot.appendChild(document.querySelector('#inject-css-tab-pane'));

  const consoleToolbar = await waitForElement('.console-main-toolbar', document.body);
  hideBySelector(consoleToolbar.shadowRoot, 'devtools-issue-counter');

  const rootView = await waitForElement('.root-view', document.body);
  rootView.appendChild(document.querySelector('#inject-css'));

  // forward some keyboard shortcuts to the parent window
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey && e.key === ',')) return

    const options = {
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    }
    const keyboardEvent = new KeyboardEvent('keydown', options)
    window.parent.dispatchEvent(keyboardEvent)

    e.preventDefault()
  }, true)
})();
`

export function Devtools(props: {
  class?: string
  iframeRef?: (el: HTMLIFrameElement) => void
}) {
  const [innerRef, setInnerRef] = createSignal<HTMLIFrameElement | undefined>()

  const { colorMode } = useColorMode()

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
        src={`${url}#?embedded=${encodeURIComponent(location.origin)}&dark=${colorMode() === 'dark'}`}
        title="Devtools"
        class="absolute inset-0 block size-full"
        onLoad={handleLoad}
      />
    </div>
  )
}
