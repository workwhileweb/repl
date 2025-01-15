import compare from 'semver/functions/compare'
import { SiGithub } from 'solid-icons/si'
import { Button } from '../../lib/components/ui/button.tsx'
import { $versions } from '../../store/versions.ts'

export function AboutTab() {
  const maxVersion = () => {
    let maxVersion = '0.0.0'
    for (const [pkg, version] of Object.entries($versions.get())) {
      if (pkg === '@mtcute/tl') continue
      if (compare(version, maxVersion) > 0) {
        maxVersion = version
      }
    }

    return maxVersion
  }

  return (
    <div class="flex h-full flex-col items-center gap-4 px-3 py-16">
      <img
        class="size-24"
        src="https://mtcute.dev/mtcute-logo.svg"
        alt="mtcute logo"
      />
      <div class="flex flex-col items-center gap-1">
        <h1 class="text-xl font-bold">
          mtcute playground
        </h1>
        <p class="text-xs text-muted-foreground">
          (running mtcute v
          {maxVersion()}
          ,
          layer
          {' '}
          {$versions.get()['@mtcute/tl'].split('.')[0]}
          )
        </p>
      </div>
      <div class="max-w-96 text-center text-sm text-muted-foreground">
        An interactive playground and REPL for mtcute
        <br />
        (a Telegram client library), right in your browser!
      </div>
      <p class="text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          as="a"
          href="https://github.com/mtcute/repl"
          target="_blank"
          class="flex flex-row items-center gap-1 text-muted-foreground"
        >
          <SiGithub class="mr-2 size-4" />
          Source code
        </Button>
      </p>
    </div>
  )
}
