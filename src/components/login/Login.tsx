import type { BaseTelegramClient, SentCode, User } from '@mtcute/web'
import { base64 } from '@fuman/utils'
import { tl } from '@mtcute/web'
import { checkPassword, downloadAsBuffer, resendCode, sendCode, signIn, signInQr } from '@mtcute/web/methods.js'
import { LucideChevronRight } from 'lucide-solid'
import { createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js'
import { renderSVG } from 'uqr'
import { Avatar, AvatarFallback, AvatarImage, makeAvatarFallbackText } from '../../lib/components/ui/avatar.tsx'
import { Button } from '../../lib/components/ui/button.tsx'
import { OTPField, OTPFieldGroup, OTPFieldInput, OTPFieldSlot } from '../../lib/components/ui/otp-field.tsx'
import { Spinner } from '../../lib/components/ui/spinner.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../lib/components/ui/text-field.tsx'
import { TransitionSlideLtr } from '../../lib/components/ui/transition.tsx'
import { cn } from '../../lib/utils.ts'
import { PhoneInput } from './PhoneInput.tsx'

export type LoginStep =
  | 'qr'
  | 'phone'
  | 'otp'
  | 'password'
  | 'done'
export interface StepContext {
  qr: void
  phone: void
  otp: {
    phone: string
    code: SentCode
  }
  password: void
  done: { user: User }
}

type StepProps<T extends LoginStep> = {
  client: BaseTelegramClient
  setStep: <T extends LoginStep>(step: T, data?: StepContext[T]) => void
} & (StepContext[T] extends void ? {} : { ctx: StepContext[T] })

function QrLoginStep(props: StepProps<'qr'>) {
  const [qr, setQr] = createSignal('')
  const [finalizing, setFinalizing] = createSignal(false)
  const abortController = new AbortController()

  onMount(() => {
    signInQr(props.client, {
      abortSignal: abortController.signal,
      onUrlUpdated: qr => setQr(renderSVG(qr)),
      onQrScanned: () => setFinalizing(true),
    }).then((user) => {
      props.setStep('done', { user })
    }).catch((e) => {
      setFinalizing(false)
      if (tl.RpcError.is(e, 'SESSION_PASSWORD_NEEDED')) {
        props.setStep('password')
      } else if (abortController.signal.aborted) {
        // ignore
      } else {
        throw e
      }
    })
  })
  onCleanup(() => abortController.abort())

  return (
    <div class="flex flex-col items-center justify-center gap-4">
      <h2 class="mb-2 text-xl font-bold">
        Log in with QR code
      </h2>
      <div class="flex size-40 flex-col items-center justify-center">
        {qr() ? (
          <div
            class="size-40"
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={qr()}
          />
        ) : <Spinner indeterminate class="size-10" />}
      </div>
      <ol class="mt-4 list-inside list-decimal text-sm text-muted-foreground">
        <li>Open Telegram on your phone</li>
        <li>
          Go to
          {' '}
          <b>Settings &gt; Devices &gt; Link Desktop Device</b>
        </li>
        <li>Point your phone at this screen to confirm login</li>
      </ol>

      <Button
        variant="outline"
        size="sm"
        onClick={() => props.setStep('phone')}
        disabled={finalizing()}
      >
        Log in with phone number
      </Button>
    </div>
  )
}

function PhoneNumberStep(props: StepProps<'phone'>) {
  const [phone, setPhone] = createSignal('')
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | undefined>()

  const abortController = new AbortController()
  const handleSubmit = () => {
    setError(undefined)
    setLoading(true)
    sendCode(props.client, {
      phone: phone(),
      abortSignal: abortController.signal,
    }).then((code) => {
      setLoading(false)
      props.setStep('otp', {
        code,
        phone: phone(),
      })
    }).catch((e) => {
      setLoading(false)
      if (abortController.signal.aborted) {
        // ignore
      } else {
        setError(e.message)
      }
    })
  }
  onCleanup(() => abortController.abort())
  createEffect(() => inputRef()?.focus())

  return (
    <div class="flex h-full flex-col items-center justify-center">
      <div class="flex-1" />
      <img
        class="size-24"
        src="https://mtcute.dev/mtcute-logo.svg"
        alt="mtcute logo"
      />
      <h2 class="mt-4 text-xl font-bold">
        Log in with phone number
      </h2>
      <div class="mt-2 text-center text-sm text-muted-foreground">
        Please confirm your country code
        <br />
        and enter your phone number
      </div>

      <TextFieldRoot class="mt-4" validationState={error() ? 'invalid' : 'valid'}>
        <TextFieldLabel>Phone</TextFieldLabel>
        <div class="flex flex-row">
          <PhoneInput
            class="w-[300px]"
            client={props.client}
            onChange={setPhone}
            onSubmit={handleSubmit}
            disabled={loading()}
            ref={setInputRef}
          />
          <Button
            variant="default"
            size="icon"
            class="ml-2 size-9"
            disabled={!phone() || loading()}
            onClick={handleSubmit}
          >
            <LucideChevronRight class="size-5" />
          </Button>
        </div>
        <TextFieldErrorMessage>{error()}</TextFieldErrorMessage>
      </TextFieldRoot>
      <div class="flex-1" />
      <div class="text-center text-sm text-muted-foreground">
        or,
        {' '}
        <a
          href="#"
          class="font-medium text-neutral-600 hover:underline"
          onClick={() => props.setStep('qr')}
        >
          log in with QR code
        </a>
      </div>
    </div>
  )
}

function OtpStep(props: StepProps<'otp'>) {
  const [otp, setOtp] = createSignal('')
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)
  const [countdown, setCountdown] = createSignal(0)
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | undefined>()

  const abortController = new AbortController()
  const handleSubmit = () => {
    setError(undefined)
    setLoading(true)
    signIn(props.client, {
      phone: props.ctx.phone,
      phoneCodeHash: props.ctx.code.phoneCodeHash,
      phoneCode: otp(),
      abortSignal: abortController.signal,
    }).then((user) => {
      setLoading(false)
      props.setStep('done', { user })
    }).catch((e) => {
      setLoading(false)
      if (abortController.signal.aborted) {
        // ignore
      } else if (tl.RpcError.is(e, 'SESSION_PASSWORD_NEEDED')) {
        props.setStep('password')
      } else {
        setError(e.message)
      }
    })
  }
  const handleResend = () => {
    setError(undefined)
    setLoading(true)
    resendCode(props.client, {
      phone: props.ctx.phone,
      phoneCodeHash: props.ctx.code.phoneCodeHash,
      abortSignal: abortController.signal,
    }).then((code) => {
      setLoading(false)
      props.setStep('otp', {
        code,
        phone: props.ctx.phone,
      })
    }).catch((e) => {
      setLoading(false)
      if (abortController.signal.aborted) {
        // ignore
      } else {
        setError(e.message)
      }
    })
  }
  const handleSetOtp = (otp: string) => {
    setOtp(otp)
    if (otp.length === props.ctx.code.length) {
      handleSubmit()
    }
  }
  onCleanup(() => abortController.abort())

  onMount(() => {
    setCountdown(props.ctx.code.timeout)
    const interval = setInterval(() => {
      setCountdown(countdown() - 1)
      if (countdown() <= 0) {
        clearInterval(interval)
        setCountdown(0)
      }
    }, 1000)
    onCleanup(() => clearInterval(interval))
  })
  createEffect(() => inputRef()?.focus())

  const description = () => {
    switch (props.ctx.code.type) {
      case 'app':
        return 'We have sent you a one-time code to your Telegram app'
      case 'sms':
      case 'sms_word':
      case 'sms_phrase':
        return 'We have sent you a one-time code to your phone'
      case 'fragment':
        return 'We have sent you a one-time code to your Fragment anonymous number'
      case 'call':
        return 'We are calling you to dictate your one-time code'
      case 'flash_call':
      case 'missed_call':
        return `We are calling you, put the last ${props.ctx.code.length} digits of the number we're calling you from`
      case 'email':
        return 'We have sent you an email with a one-time code'
      case 'email_required':
        return 'Email setup is required, please do it in your Telegram app'
      default:
        return `Unknown code type: ${props.ctx.code.type}`
    }
  }

  return (
    <div class="flex flex-col items-center justify-center">
      <h2 class="text-xl font-bold">
        {props.ctx.phone}
      </h2>
      <div
        class="cursor-pointer text-xs text-neutral-400 hover:underline"
        onClick={() => props.setStep('phone')}
      >
        Wrong number?
      </div>

      <div class="mt-4 text-center text-sm text-muted-foreground">
        {description()}
      </div>
      <div class="mt-4 flex flex-col">
        <Show
          when={props.ctx.code.type !== 'sms_phrase' && props.ctx.code.type !== 'sms_word'}
          fallback={(
            <TextFieldRoot class="mt-2" validationState={error() ? 'invalid' : 'valid'}>
              <TextFieldFrame>
                <TextField
                  disabled={loading()}
                  placeholder={props.ctx.code.beginning ? `${props.ctx.code.beginning}...` : undefined}
                  autocomplete="one-time-code"
                  value={otp()}
                  onInput={e => setOtp(e.currentTarget.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit()
                    }
                  }}
                  ref={setInputRef}
                />
              </TextFieldFrame>
              <TextFieldErrorMessage>{error()}</TextFieldErrorMessage>
            </TextFieldRoot>
          )}
        >
          <OTPField
            class="mt-2"
            maxLength={props.ctx.code.length}
            value={otp()}
            onValueChange={handleSetOtp}
          >
            <OTPFieldInput
              disabled={loading()}
              ref={setInputRef}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
            />
            <OTPFieldGroup>
              <For each={Array.from({ length: props.ctx.code.length })}>
                {(_, i) => (
                  <OTPFieldSlot
                    class={error() ? 'border-error-foreground' : ''}
                    index={i()}
                  />
                )}
              </For>
            </OTPFieldGroup>
          </OTPField>
          {error() && (
            <div class="mt-1 text-sm text-error-foreground">
              {error()}
            </div>
          )}
        </Show>

        <div class="mt-2 flex w-full justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={loading() || countdown() > 0}
          >
            {props.ctx.code.nextType === 'call' ? 'Call me' : 'Resend'}
            {countdown() > 0 && (
              ` (${countdown()})`
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={loading()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function PasswordStep(props: StepProps<'password'>) {
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | undefined>()

  // todo abort controller
  const handleSubmit = () => {
    if (!password()) {
      setError('Password is required')
      return
    }

    setError(undefined)
    setLoading(true)
    checkPassword(props.client, password())
      .then((user) => {
        setLoading(false)
        props.setStep('done', { user })
      })
      .catch((e) => {
        setLoading(false)
        if (tl.RpcError.is(e, 'PASSWORD_HASH_INVALID')) {
          setError('Incorrect password')
        } else {
          setError(e.message)
        }
      })
  }
  createEffect(() => inputRef()?.focus())

  return (
    <div class="flex flex-col items-center justify-center">
      <h2 class="text-xl font-bold">
        2FA password
      </h2>
      <div class="mt-4 text-center text-sm text-muted-foreground">
        Your account is protected with an additional password.
      </div>
      <div class="mt-4 flex flex-col">
        <TextFieldRoot validationState={error() ? 'invalid' : 'valid'}>
          <TextFieldLabel>Password</TextFieldLabel>
          <TextFieldFrame>
            <TextField
              type="password"
              placeholder="Password"
              autocomplete="current-password"
              value={password()}
              onInput={e => setPassword(e.currentTarget.value)}
              disabled={loading()}
              ref={setInputRef}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
            />
          </TextFieldFrame>
          <TextFieldErrorMessage>{error()}</TextFieldErrorMessage>
        </TextFieldRoot>

        <div class="mt-2 flex w-full justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={loading()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function DoneStep(props: StepProps<'done'>) {
  const [avatar, setAvatar] = createSignal<string | null>(null)

  onMount(() => {
    if (!props.ctx.user.photo) {
      props.client.close()
      return
    }

    downloadAsBuffer(props.client, props.ctx.user.photo.big)
      .then((buf) => {
        const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }))
        setAvatar(url)
      })
      .catch((e) => {
        console.error(e)
      })
  })

  onCleanup(() => {
    if (avatar()) {
      URL.revokeObjectURL(avatar()!)
    }
  })

  return (
    <div class="flex flex-col items-center justify-center">
      <Avatar class="mb-4 size-24 shadow-sm">
        {props.ctx.user.photo && (
          <>
            {avatar() && <AvatarImage src={avatar()!} />}
            <AvatarImage src={`data:image/jpeg;base64,${base64.encode(props.ctx.user.photo.thumb!)}`} />
          </>
        )}
        <AvatarFallback class="text-xl">
          {makeAvatarFallbackText(props.ctx.user.displayName)}
        </AvatarFallback>
      </Avatar>
      <div class="text-center font-medium">
        Welcome,
        {' '}
        {props.ctx.user.displayName}
        !
      </div>
    </div>
  )
}

export function LoginForm(props: {
  class?: string
  client: BaseTelegramClient
  onStepChange?: (step: LoginStep, ctx: Partial<StepContext>) => void
}) {
  const [step, setStep] = createSignal<LoginStep>('qr')
  const [ctx, setCtx] = createSignal<Partial<StepContext>>({})

  const setStepWithCtx = <T extends LoginStep>(step: T, data?: StepContext[T]) => {
    setCtx(ctx => ({ ...ctx, [step]: data }))
    setStep(step as LoginStep)
    props.onStepChange?.(step, ctx())
  }

  return (
    <div class={cn('flex h-full flex-col items-center justify-center gap-4', props.class)}>
      <TransitionSlideLtr mode="outin">
        <Switch>
          <Match when={step() === 'qr'}>
            <QrLoginStep client={props.client} setStep={setStepWithCtx} />
          </Match>
          <Match when={step() === 'phone'}>
            <PhoneNumberStep client={props.client} setStep={setStepWithCtx} />
          </Match>
          <Match when={step() === 'otp'}>
            <OtpStep client={props.client} setStep={setStepWithCtx} ctx={ctx().otp!} />
          </Match>
          <Match when={step() === 'password'}>
            <PasswordStep client={props.client} setStep={setStepWithCtx} />
          </Match>
          <Match when={step() === 'done'}>
            <DoneStep
              client={props.client}
              setStep={setStepWithCtx}
              ctx={ctx().done!}
            />
          </Match>
        </Switch>
      </TransitionSlideLtr>
    </div>
  )
}
