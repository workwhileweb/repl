import { atom } from 'nanostores'

export const $versions = atom<Record<string, string>>({})
