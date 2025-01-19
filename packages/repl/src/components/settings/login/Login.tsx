import type { mtcute, TelegramAccount } from 'mtcute-repl-worker/client'
import type { Setter } from 'solid-js'
import { unknownToError } from '@fuman/utils'
import { LucideChevronRight, LucideLockKeyhole, MessageSquareMore } from 'lucide-solid'
import { workerInvoke, workerOn } from 'mtcute-repl-worker/client'
import { createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js'
import { Button } from '../../../lib/components/ui/button.tsx'
import { OTPField, OTPFieldGroup, OTPFieldInput, OTPFieldSlot } from '../../../lib/components/ui/otp-field.tsx'
import { Spinner } from '../../../lib/components/ui/spinner.tsx'
import { TextField, TextFieldErrorMessage, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'
import { TransitionSlideLtr } from '../../../lib/components/ui/transition.tsx'
import { cn } from '../../../lib/utils.ts'
import { AccountAvatar } from '../../AccountAvatar.tsx'
import { PhoneInput } from './PhoneInput.tsx'

export type LoginStep =
  | 'qr'
  | 'phone'
  | 'otp'
  | 'password'
  | 'done'
export interface StepContext {
  qr: void
  phone: { setInputRef: Setter<HTMLInputElement | undefined> }
  otp: {
    setInputRef: Setter<HTMLInputElement | undefined>
    phone: string
    code: mtcute.SentCode
  }
  password: { setInputRef: Setter<HTMLInputElement | undefined> }
  done: { account: TelegramAccount }
}

type StepProps<T extends LoginStep> = {
  accountId: string
  setStep: <T extends LoginStep>(step: T, data?: StepContext[T]) => void
} & (StepContext[T] extends void ? {} : { ctx: StepContext[T] })

function QrLoginStep(props: StepProps<'qr'>) {
  const [qr, setQr] = createSignal('')
  const [finalizing, setFinalizing] = createSignal(false)
  const abortController = new AbortController()

  onMount(async () => {
    const cleanup1 = workerOn('QrCodeUpdate', (e) => {
      if (e.accountId !== props.accountId) return
      setQr(e.qrCode)
    })
    const cleanup2 = workerOn('QrCodeScanned', (e) => {
      if (e.accountId !== props.accountId) return
      setFinalizing(true)
    })
    onCleanup(() => {
      cleanup1()
      cleanup2()
    })

    const result = await workerInvoke('telegram', 'signInQr', {
      accountId: props.accountId,
      abortSignal: abortController.signal,
    })
    if (result === 'need_password') {
      props.setStep('password')
    } else {
      props.setStep('done', { account: result })
    }
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
      <ol class="text-muted-foreground mt-4 list-inside list-decimal text-sm">
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

  const abortController = new AbortController()
  const handleSubmit = async () => {
    setError(undefined)
    setLoading(true)

    try {
      const code = await workerInvoke('telegram', 'sendCode', {
        accountId: props.accountId,
        phone: phone(),
        abortSignal: abortController.signal,
      })
      setLoading(false)
      props.setStep('otp', {
        phone: phone(),
        code,
        setInputRef: props.ctx.setInputRef,
      })
    } catch (e) {
      setLoading(false)
      if (abortController.signal.aborted) {
        // ignore
      } else {
        setError(unknownToError(e).message)
      }
    }
  }
  onCleanup(() => abortController.abort())

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
      <div class="text-muted-foreground mt-2 text-center text-sm">
        Please confirm your country code
        <br />
        and enter your phone number
      </div>

      <TextFieldRoot class="mt-4" validationState={error() ? 'invalid' : 'valid'}>
        <TextFieldLabel>Phone</TextFieldLabel>
        <div class="flex flex-row">
          <PhoneInput
            class="w-[300px]"
            accountId={props.accountId}
            onChange={setPhone}
            onSubmit={handleSubmit}
            disabled={loading()}
            ref={props.ctx.setInputRef}
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
      <div class="text-muted-foreground text-center text-sm">
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

  const abortController = new AbortController()
  const handleSubmit = async () => {
    setError(undefined)
    setLoading(true)

    try {
      const account = await workerInvoke('telegram', 'signIn', {
        accountId: props.accountId,
        phone: props.ctx.phone,
        phoneCodeHash: props.ctx.code.phoneCodeHash,
        phoneCode: otp(),
        abortSignal: abortController.signal,
      })
      if (account === 'need_password') {
        props.setStep('password')
      } else {
        props.setStep('done', { account })
      }
    } catch (e) {
      setLoading(false)
      if (abortController.signal.aborted) {
        // ignore
      } else {
        setError(unknownToError(e).message)
      }
    }
  }
  const handleResend = async () => {
    setError(undefined)
    setLoading(true)
    try {
      const code = await workerInvoke('telegram', 'resendCode', {
        accountId: props.accountId,
        phone: props.ctx.phone,
        phoneCodeHash: props.ctx.code.phoneCodeHash,
        abortSignal: abortController.signal,
      })
      setLoading(false)
      props.setStep('otp', {
        setInputRef: props.ctx.setInputRef,
        phone: props.ctx.phone,
        code,
      })
    } catch (e) {
      setLoading(false)
      if (abortController.signal.aborted) {
        // ignore
      } else {
        setError(unknownToError(e).message)
      }
    }
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

  const description = () => {
    switch (props.ctx.code.type) {
      case 'app':
        return 'We have sent you a one-time code to your Telegram app.'
      case 'sms':
      case 'sms_word':
      case 'sms_phrase':
        return 'We have sent you a one-time code to your phone.'
      case 'fragment':
        return 'We have sent you a one-time code to your Fragment anonymous number.'
      case 'call':
        return 'We are calling you to dictate your one-time code.'
      case 'flash_call':
      case 'missed_call':
        return `We are calling you, put the last ${props.ctx.code.length} digits of the number we're calling you from.`
      case 'email':
        return 'We have sent you an email with a one-time code.'
      case 'email_required':
        return 'Email setup is required, please do it in your Telegram app.'
      default:
        return `Unknown code type: ${props.ctx.code.type}.`
    }
  }

  return (
    <div class="flex flex-col items-center justify-center">
      <MessageSquareMore class="size-16 pb-2" strokeWidth={1.5} />
      <h2 class="text-xl font-bold">
        {props.ctx.phone}
      </h2>
      <div
        class="cursor-pointer text-xs text-neutral-400 hover:underline"
        onClick={() => props.setStep('phone')}
      >
        Wrong number?
      </div>

      <div class="text-muted-foreground mt-4 text-center text-sm">
        {description()}
      </div>
      <div class="mt-4 flex flex-col items-center text-center">
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
                  ref={props.ctx.setInputRef}
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
              ref={props.ctx.setInputRef}
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
            <div class="text-error-foreground mt-1 text-sm">{error()}</div>
          )}
        </Show>

        <div class="mt-2 flex items-center align-middle">
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
        </div>
      </div>
    </div>
  )
}

function PasswordStep(props: StepProps<'password'>) {
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | undefined>()
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string | undefined>()
  const [loading, setLoading] = createSignal(false)

  onMount(() => {
    const pasteHandler = () => {
      if (document.activeElement !== inputRef()) {
        inputRef()?.focus()
      }
    }

    window.addEventListener('paste', pasteHandler)

    onCleanup(() => {
      window.removeEventListener('paste', pasteHandler)
    })
  })

  const abortController = new AbortController()
  onCleanup(() => abortController.abort())

  const handleSubmit = async () => {
    if (!password()) {
      setError('Password is required')
      inputRef()?.focus()
      return
    }

    setError(undefined)
    setLoading(true)
    try {
      const user = await workerInvoke('telegram', 'checkPassword', {
        accountId: props.accountId,
        password: password(),
        abortSignal: abortController.signal,
      })
      props.setStep('done', { account: user })
    } catch (e) {
      setLoading(false)
      setError(unknownToError(e).message)
    }

    inputRef()?.focus()
  }

  return (
    <div class="flex flex-col items-center justify-center">
      <LucideLockKeyhole class="size-16 pb-2" strokeWidth={1.5} />
      <h2 class="text-xl font-bold">
        2FA password
      </h2>
      <div class="text-muted-foreground mt-4 text-center text-sm">
        Your account is protected with an additional password.
      </div>
      <div class="mt-4">
        <TextFieldRoot validationState={error() ? 'invalid' : 'valid'}>
          <TextFieldLabel>Password</TextFieldLabel>
          <div class="flex flex-row">
            <TextFieldFrame>
              <TextField
                type="password"
                placeholder="Password"
                autocomplete="current-password"
                value={password()}
                onInput={e => setPassword(e.currentTarget.value)}
                disabled={loading()}
                ref={(e) => { props.ctx.setInputRef(e); setInputRef(e) }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit()
                  }
                }}
              />
            </TextFieldFrame>
            <Button
              variant="default"
              size="icon"
              class="ml-2 size-9 min-w-[36px]"
              disabled={loading() || password() === ''}
              onClick={handleSubmit}
            >
              <LucideChevronRight class="size-5" />
            </Button>
          </div>
          <TextFieldErrorMessage>{error()}</TextFieldErrorMessage>
        </TextFieldRoot>
      </div>
    </div>
  )
}

function DoneStep(props: StepProps<'done'>) {
  return (
    <div class="flex flex-col items-center justify-center">
      <AccountAvatar
        account={props.ctx.account}
        class="animate-scale-up fill-mode-forwards mb-4 size-24 shadow-sm"
      />
      <div class="animate-fade-out-down fill-mode-forwards text-center font-medium">
        Welcome,
        {' '}
        {props.ctx.account.name}
        !
      </div>
    </div>
  )
}

export function LoginForm(props: {
  class?: string
  accountId: string
  onStepChange?: (step: LoginStep, ctx: Partial<StepContext>) => void
}) {
  const [step, setStep] = createSignal<LoginStep>('qr')
  const [ctx, setCtx] = createSignal<Partial<StepContext>>({})

  const setStepWithCtx = <T extends LoginStep>(step: T, data?: StepContext[T]) => {
    setCtx(ctx => ({ ...ctx, [step]: data }))
    setStep(step as LoginStep)
    props.onStepChange?.(step, ctx())
  }

  const [inputRef, setInputRef] = createSignal<HTMLInputElement | undefined>()

  onMount(() => {
    const pasteHandler = () => {
      if (document.activeElement !== inputRef()) {
        inputRef()?.focus()
      }
    }

    const handleKeyDown = () => {
      inputRef()?.focus()
    }

    window.addEventListener('paste', pasteHandler)
    window.addEventListener('keydown', handleKeyDown)

    onCleanup(() => {
      window.removeEventListener('paste', pasteHandler)
      window.removeEventListener('keydown', handleKeyDown)
    })
  })

  return (
    <div class={cn('flex h-full flex-col items-center justify-center gap-4', props.class)}>
      <TransitionSlideLtr onAfterExit={() => inputRef()?.focus()} mode="outin">
        <Switch>
          <Match when={step() === 'qr'}>
            <QrLoginStep accountId={props.accountId} setStep={setStepWithCtx} />
          </Match>
          <Match when={step() === 'phone'}>
            <PhoneNumberStep accountId={props.accountId} setStep={setStepWithCtx} ctx={{ setInputRef }} />
          </Match>
          <Match when={step() === 'otp'}>
            <OtpStep accountId={props.accountId} setStep={setStepWithCtx} ctx={{ ...ctx().otp!, setInputRef }} />
          </Match>
          <Match when={step() === 'password'}>
            <PasswordStep accountId={props.accountId} setStep={setStepWithCtx} ctx={{ setInputRef }} />
          </Match>
          <Match when={step() === 'done'}>
            <DoneStep
              accountId={props.accountId}
              setStep={setStepWithCtx}
              ctx={ctx().done!}
            />
          </Match>
        </Switch>
      </TransitionSlideLtr>
    </div>
  )
}
