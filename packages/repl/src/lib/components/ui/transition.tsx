import type { JSX } from 'solid-js'
import { Transition } from 'solid-transition-group'

export function TransitionSlideLtr(props: { mode?: 'outin' | 'inout', onAfterExit?: (element: Element) => void, children: JSX.Element }) {
  return (
    <Transition
      mode={props.mode}
      enterActiveClass="transition-[transform, opacity] duration-150 ease-in-out motion-reduce:transition-none"
      exitActiveClass="transition-[transform, opacity] duration-150 ease-in-out motion-reduce:transition-none"
      enterClass="translate-x-5 opacity-0"
      exitToClass="-translate-x-5 opacity-0"
      onAfterExit={props.onAfterExit}
    >
      {props.children}
    </Transition>
  )
}
