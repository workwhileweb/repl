import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout'))
    }, timeout)

    promise.then((res) => {
      clearTimeout(timeoutId)
      resolve(res)
    }).catch((err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
  })
}
