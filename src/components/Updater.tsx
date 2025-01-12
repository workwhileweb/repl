import { asyncPool } from '@fuman/utils'

import { filesize } from 'filesize'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { Spinner } from '../lib/components/ui/spinner.tsx'
import { downloadNpmPackage, getLatestVersions, getPackagesToDownload } from '../lib/vfs/downloader'
import { VfsStorage } from '../lib/vfs/storage'
import { swClearCache } from '../sw/client.ts'

export interface UpdaterProps {
  onComplete: (versions: Record<string, string>) => void
}

export function Updater(props: UpdaterProps) {
  const [downloadedBytes, setDownloadedBytes] = createSignal(0)
  const [totalBytes, setTotalBytes] = createSignal(Infinity)
  const [step, setStep] = createSignal('Idle')

  let abortController: AbortController | undefined

  async function runUpdater() {
    if (abortController) abortController.abort()

    abortController = new AbortController()
    const signal = abortController.signal

    setStep('Checking for updates...')
    const vfs = await VfsStorage.create()
    const latestVersions = await getLatestVersions()
    const versions = await getPackagesToDownload(latestVersions, vfs)

    if (Object.keys(versions).length === 0) {
      props.onComplete(latestVersions)
      return
    }

    const entries = Object.entries(versions)

    setStep('Downloading...')
    await swClearCache()
    await asyncPool(entries, async ([lib, version]) => {
      let isFirst = true
      let prevDownloaded = 0

      function onProgress(downloaded: number, total: number) {
        if (isFirst) {
          setTotalBytes(prev => prev === Infinity ? total : prev + total)
          isFirst = false
        }

        const diff = downloaded - prevDownloaded
        setDownloadedBytes(prev => prev + diff)
        prevDownloaded = downloaded
      }

      await downloadNpmPackage({
        packageName: lib,
        version,
        storage: vfs,
        progress: onProgress,
        filterFiles: (file) => {
          if (!file.header) return true
          const name = file.header.name
          return !name.endsWith('.cjs') && !name.endsWith('.d.cts') && name !== 'LICENSE' && name !== 'README.md'
        },
        signal,
      })
    })

    props.onComplete(latestVersions)
  }

  onMount(() => {
    runUpdater()
  })

  onCleanup(() => {
    abortController?.abort()
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
