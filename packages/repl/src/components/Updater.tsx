import { filesize } from 'filesize'
import { workerInvoke, workerOn } from 'mtcute-repl-worker/client'
import { createSignal, onMount } from 'solid-js'
import { Spinner } from '../lib/components/ui/spinner.tsx'

export interface UpdaterProps {
  onComplete: () => void
}

export function Updater(props: UpdaterProps) {
  const [downloadedBytes, setDownloadedBytes] = createSignal(0)
  const [totalBytes, setTotalBytes] = createSignal(Infinity)
  const [step, setStep] = createSignal('Idle')

  async function runUpdater() {
    setStep('Checking for updates...')
    const updates = await workerInvoke('vfs', 'checkForUpdates')

    if (Object.keys(updates).length === 0) {
      props.onComplete()
      return
    }

    setStep('Downloading...')

    const cleanup = workerOn('UpdateProgress', ({ progress, total }) => {
      setDownloadedBytes(progress)
      setTotalBytes(total)
    })
    await workerInvoke('vfs', 'downloadPackages', updates)
    cleanup()

    props.onComplete()
  }

  onMount(() => {
    runUpdater()
  })

  return (
    <div class="flex flex-col items-center gap-2 p-4">
      <Spinner
        class="size-10"
        indeterminate
      />
      <div class="text-center text-xs text-muted-foreground">
        {step()}
        {totalBytes() !== Infinity && (
          <div>
            {filesize(downloadedBytes())}
            {' / '}
            {filesize(totalBytes())}
          </div>
        )}
      </div>
    </div>
  )
}
