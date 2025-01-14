import { workerInvoke, workerOn } from 'mtcute-repl-worker/client'
import { atom, type ReadableAtom, type WritableAtom } from 'nanostores'

const linkedAtoms = new Map<string, WritableAtom<any>>()
let registered = false
let isInternalWrite = false

export function linkedAtom<T>(id: string): ReadableAtom<T> & WritableAtom<T> {
  if (!registered) {
    workerOn('AtomUpdate', ({ id, value }) => {
      isInternalWrite = true
      linkedAtoms.get(id)?.set(value)
      isInternalWrite = false
    })
    registered = true
  }

  const store = atom<T>(null!)
  store.listen((value) => {
    if (isInternalWrite) return
    workerInvoke('atom', 'write', { id, value })
  })
  linkedAtoms.set(id, store)
  return store
}
