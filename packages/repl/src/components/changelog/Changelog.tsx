import {
  createQuery,
} from '@tanstack/solid-query'
import { createSignal, ErrorBoundary, For, onMount, Show, Suspense } from 'solid-js'
import { Avatar, AvatarFallback, AvatarImage, makeAvatarFallbackText } from '../../lib/components/ui/avatar'
import { Button } from '../../lib/components/ui/button'
import { Dialog, DialogContent } from '../../lib/components/ui/dialog'
import { Skeleton } from '../../lib/components/ui/skeleton'

interface Commit {
  message?: string
  authorName?: string
  authorUsername?: string
  authorAvatar?: string
  authorUrl?: string
  date?: string
  commitHash?: string
  commitUrl?: string
}

function getRandomSizes(len: number) {
  return Array.from({ length: len }, () => ({
    msg: Math.random() * 192 + 128,
    sub: [
      Math.random() * 32 + 32,
      Math.random() * 32 + 32,
      Math.random() * 32 + 32,
    ],
  }))
}

const lastPageRegex = /page=(\d*)>; rel="last"/g

export function ChangelogDialog(props: {
  show: boolean
  onClose: () => void
}) {
  const commitsPerPage = 15

  const [lastPage, setLastPage] = createSignal(1)

  onMount(async () => {
    const result = await fetch(`https://api.github.com/repos/mtcute/repl/commits?per_page=${commitsPerPage}`, {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json',
      },
    })

    const link = result.headers.get('link')

    if (link === null) return

    const match = lastPageRegex.exec(link)
    if (match !== null && match.length > 1) {
      setLastPage(Number.parseInt(match[1]))
    }
  })

  const [page, setPage] = createSignal(1)
  const commitsQuery = createQuery<Commit[]>(() => ({
    queryKey: ['repo commits', page()],
    queryFn: async () => {
      const result = await fetch(`https://api.github.com/repos/mtcute/repl/commits?per_page=${commitsPerPage}&page=${page()}`, {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
          'Accept': 'application/vnd.github+json',
        },
      })

      if (!result.ok) throw new Error('Failed to fetch data')

      return result.json().then(e => e.map((e: any) => ({
        message: e?.commit?.message?.split(':').at(-1)?.trim(),
        authorName: e?.commit?.author?.name,
        authorUsername: e?.author?.login,
        authorAvatar: e?.committer?.avatar_url,
        authorUrl: e?.author?.html_url,
        date: e?.commit?.author?.date,
        commitHash: e?.sha,
        commitUrl: e?.html_url,
      })))
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    throwOnError: true, // Throw an error if the query fails
  }))

  const [skeletonSizes, setSkeletonSizes] = createSignal<{ msg: number, sub: number[] }[]>(getRandomSizes(commitsPerPage))

  return (
    <Dialog
      open={props.show}
      onOpenChange={open => !open && props.onClose()}
    >
      <DialogContent class="flex w-[calc(100vw-96px)] max-w-[960px] flex-col gap-2 overflow-auto p-2">
        <div class="flex flex-row items-center gap-3 px-2">
          <h1 class="text-lg font-bold">Changelog</h1>
          <div class="text-sm opacity-75">
            <Show when={commitsQuery.data !== null}>
              {(() => {
                const date = commitsQuery.data?.at(0)?.date
                if (date) return new Date(date).toLocaleDateString()
                return '???'
              })()}
              &nbsp;to&nbsp;
              {(() => {
                const date = commitsQuery.data?.at(-1)?.date
                if (date) return new Date(date).toLocaleDateString()
                return '???'
              })()}
            </Show>
          </div>
        </div>
        <div class="relative flex flex-col rounded-md border">
          <ErrorBoundary fallback={(
            <>
              <For each={Array.from({ length: commitsPerPage }, (_, index) => index)}>
                {_ => (
                  <div class="hover:bg-muted/50 box-content flex h-[24px] items-center justify-between px-3 py-1.5 [&:not(:last-child)]:border-b" />
                )}
              </For>
              <div class="absolute flex size-full items-center justify-center">
                <div class="bg-background rounded-md border p-4 shadow-sm">
                  Error while loading the changelog.
                </div>
              </div>
            </>
          )}
          >
            <Suspense fallback={(
              <For each={Array.from({ length: commitsPerPage }, (_, index) => index)}>
                {i => (
                  <div class="hover:bg-muted/50 box-content flex h-[24px] items-center justify-between px-3 py-1.5 [&:not(:last-child)]:border-b">
                    <Skeleton class="h-4" style={{ width: `${skeletonSizes()[i].msg}px` }} />
                    <div class="flex items-center text-xs">
                      <div class="flex opacity-50">
                        <Skeleton class="h-4" style={{ width: `${skeletonSizes()[i].sub[0]}px` }} />
                        &nbsp;•&nbsp;
                        <Skeleton class="h-4" style={{ width: `${skeletonSizes()[i].sub[1]}px` }} />
                        &nbsp;•&nbsp;
                      </div>
                      <div class="flex cursor-pointer items-center gap-1.5 hover:underline">
                        <div class="opacity-50">
                          <Skeleton class="h-4" style={{ width: `${skeletonSizes()[i].sub[2]}px` }} />
                        </div>
                        <Skeleton class="size-4 rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </For>
            )}
            >
              <For each={commitsQuery.data}>
                {commit => (
                  <div class="hover:bg-muted/50 flex justify-between px-3 py-1.5 [&:not(:last-child)]:border-b">
                    <div>
                      <a href={commit.commitUrl} target="_blank" class="text-sm font-semibold capitalize hover:underline">
                        {commit.message}
                      </a>
                    </div>
                    <div class="flex items-center text-xs">
                      <div class="opacity-50">
                        {commit.date ? new Date(commit.date).toLocaleDateString() : 'unknown'}
                        &nbsp;•&nbsp;
                        {commit.commitHash?.slice(0, 7) ?? 'unknown'}
                        &nbsp;•&nbsp;
                      </div>
                      <a href={commit.authorUrl} target="_blank" class="flex cursor-pointer items-center gap-1.5 hover:underline">
                        <div class="opacity-50">
                          {commit.authorUsername ?? 'unknown'}
                        </div>
                        <Avatar class="size-4">
                          <AvatarImage src={commit.authorAvatar} />
                          <AvatarFallback class="whitespace-nowrap rounded-none">
                            {makeAvatarFallbackText(commit.authorUsername ?? 'unknown')}
                          </AvatarFallback>
                        </Avatar>
                      </a>
                    </div>
                  </div>
                )}
              </For>
              <For each={Array.from({ length: commitsPerPage - (commitsQuery.data?.length ?? 0) })}>
                {_ => (
                  <div class="hover:bg-muted/50 box-content flex h-[24px] justify-between px-3 py-1.5 [&:not(:last-child)]:border-b" />
                )}
              </For>
            </Suspense>
          </ErrorBoundary>
        </div>
        <div class="flex justify-center gap-4">
          <Button
            variant="ghost"
            disabled={page() === 1}
            onClick={() => {
              setSkeletonSizes(getRandomSizes(commitsPerPage))
              setPage(page() - 1)
            }}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            disabled={page() === lastPage()}
            onClick={() => {
              setSkeletonSizes(getRandomSizes(commitsPerPage))
              setPage(page() + 1)
            }}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
