import type { ReadableAtom, WritableAtom } from 'nanostores'
import { emitEvent } from '../worker/utils.ts'

const linkedAtoms = new Map<string, ReadableAtom<any> & WritableAtom<any>>()
export function linkAtom<T>(atom: ReadableAtom<T> & WritableAtom<T>, id: string) {
  atom.subscribe((value) => {
    emitEvent('AtomUpdate', { id, value })
  })
  linkedAtoms.set(id, atom)
}

export function publishLinkedAtoms() {
  for (const [id, atom] of linkedAtoms) {
    emitEvent('AtomUpdate', { id, value: atom.get() })
  }
}

export function writeLinkedAtom<T>(id: string, value: T) {
  const atom = linkedAtoms.get(id)
  if (!atom) return
  atom.set(value)
}
