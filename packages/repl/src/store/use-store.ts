// based on https://github.com/nanostores/solid/blob/master/src/index.ts, but using signals instead of stores because they make no sense here
import type { Store, StoreValue } from 'nanostores'
import type { Accessor } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'

/**
 * Subscribes to store changes and gets store’s value.
 *
 * @param store Store instance.
 * @returns Store value.
 */
export function useStore<SomeStore extends Store, Value extends StoreValue<SomeStore>>(
  store: SomeStore,
): Accessor<Value> {
  // Activate the store explicitly:
  // https://github.com/nanostores/solid/issues/19
  const unbindActivation = store.listen(() => {})

  const [state, setState] = createSignal(store.get())

  const unsubscribe = store.subscribe((newValue) => {
    setState(newValue)
  })

  onCleanup(() => unsubscribe())

  // Remove temporary listener now that there is already a proper subscriber.
  unbindActivation()

  return state
}
