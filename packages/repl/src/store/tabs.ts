import { atom } from 'nanostores'

export interface EditorTab {
  id: string
  fileName: string
  main: boolean
}

export const $tabs = atom<EditorTab[]>([
  {
    id: 'main',
    fileName: 'main.ts',
    main: true,
  },
])

export const $activeTab = atom('main')
