import workerUrl from '../../sw.ts?worker&url'

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 2rem; color: #fff; background-color: #000">
          <div>Service worker support is required to use this app.</div>
          <div>Please enable it in your browser settings (or update your browser).</div>
      </div>
    `
    throw new Error('Service worker not supported')
  }

  navigator.serviceWorker.register(
    workerUrl,
    { type: 'module', scope: './' },
  ).then((reg) => {
    const url = new URL(window.location.href)
    const FIX_KEY = 'swfix'
    const swfix = Number(url.searchParams.get(FIX_KEY) ?? 0)

    if (reg.active && !navigator.serviceWorker.controller) {
      if (swfix >= 3) {
        throw new Error('no controller')
      }

      // sometimes this happens on hard refresh
      return reg.unregister().then(() => {
        url.searchParams.set(FIX_KEY, `${swfix + 1}`)
        location.replace(url)
      })
    }

    if (swfix) {
      url.searchParams.delete(FIX_KEY)
      history.pushState(undefined, '', url)
    }
  })
}
