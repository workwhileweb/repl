import { asyncPool } from '@fuman/utils'
import { swInvokeMethod } from '../sw/client.ts'
import { downloadNpmPackage, getLatestVersions, getPackagesToDownload } from '../vfs/downloader.ts'
import { VfsStorage } from '../vfs/storage.ts'
import { emitEvent } from './utils.ts'

let _vfs: VfsStorage | undefined
async function getVfs() {
  if (!_vfs) {
    _vfs = await VfsStorage.create()
  }
  return _vfs
}

export class ReplWorkerVfs {
  async checkForUpdates(): Promise<Record<string, string>> {
    const latestVersions = await getLatestVersions()
    const versions = await getPackagesToDownload(latestVersions, await getVfs())

    return versions
  }

  async downloadPackages(packages: Record<string, string>) {
    await swInvokeMethod({ event: 'CLEAR_CACHE' })
    const vfs = await getVfs()

    let downloadedBytes = 0
    let totalBytes = 0
    await asyncPool(Object.entries(packages), async ([lib, version]) => {
      let isFirst = true
      let prevDownloaded = 0

      function onProgress(downloaded: number, total: number) {
        if (isFirst) {
          totalBytes += total
          isFirst = false
        }

        const diff = downloaded - prevDownloaded
        downloadedBytes += diff
        prevDownloaded = downloaded

        emitEvent('UpdateProgress', { progress: downloadedBytes, total: totalBytes })
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
      })
    })
  }

  async getLibraryNames() {
    return (await getVfs()).getAvailableLibs()
  }

  async getLibrary(name: string) {
    return (await getVfs()).readLibrary(name)
  }
}
