import type { CustomApiFields } from 'mtcute-repl-worker/client'
import type { SetStoreFunction } from 'solid-js/store'
import { createSignal, Show } from 'solid-js'
import { createStore, unwrap } from 'solid-js/store'
import { Button } from '../../../lib/components/ui/button.tsx'
import { Checkbox, CheckboxControl, CheckboxLabel } from '../../../lib/components/ui/checkbox.tsx'
import { Dialog, DialogContent, DialogHeader } from '../../../lib/components/ui/dialog.tsx'
import { TextField, TextFieldFrame, TextFieldLabel, TextFieldRoot } from '../../../lib/components/ui/text-field.tsx'
import { cn } from '../../../lib/utils.ts'

export function useCustomApiFormState() {
  // eslint-disable-next-line solid/reactivity
  return createStore<CustomApiFields>({
    apiId: '',
    apiHash: '',
    deviceModel: '',
    systemVersion: '',
    appVersion: '',
    systemLangCode: '',
    langPack: '',
    langCode: '',
    extraJson: '',
  })
}

export function CustomApiForm(props: {
  class?: string
  state: CustomApiFields
  setState: SetStoreFunction<CustomApiFields>
}) {
  const [showAdvanced, setShowAdvanced] = createSignal(false)

  return (
    <div class={cn('flex flex-col gap-2', props.class)}>
      <div class="flex flex-row gap-2">
        <TextFieldRoot class="flex-1">
          <TextFieldLabel>API ID</TextFieldLabel>
          <TextFieldFrame>
            <TextField
              placeholder="2040"
              value={props.state.apiId}
              onInput={e => props.setState('apiId', e.currentTarget.value.replace(/\D/g, ''))}
            />
          </TextFieldFrame>
        </TextFieldRoot>
        <TextFieldRoot class="flex-[2]">
          <TextFieldLabel>API Hash</TextFieldLabel>
          <TextFieldFrame>
            <TextField
              placeholder="b18441..."
              value={props.state.apiHash}
              onInput={e => props.setState('apiHash', e.currentTarget.value)}
            />
          </TextFieldFrame>
        </TextFieldRoot>
      </div>

      <Checkbox
        checked={showAdvanced()}
        onChange={setShowAdvanced}
        class="my-2 flex flex-row items-center gap-2 text-sm"
      >
        <CheckboxControl />
        <CheckboxLabel>
          Show advanced fields
        </CheckboxLabel>
      </Checkbox>

      <Show when={showAdvanced()}>
        <div class="flex w-full flex-row gap-2">
          <TextFieldRoot class="w-full">
            <TextFieldLabel>Device model</TextFieldLabel>
            <TextFieldFrame>
              <TextField
                placeholder="iPhone14,5"
                value={props.state.deviceModel}
                onInput={e => props.setState('deviceModel', e.currentTarget.value)}
              />
            </TextFieldFrame>
          </TextFieldRoot>

          <TextFieldRoot class="w-full">
            <TextFieldLabel>Language pack</TextFieldLabel>
            <TextFieldFrame>
              <TextField
                placeholder="ios"
                value={props.state.langPack}
                onInput={e => props.setState('langPack', e.currentTarget.value)}
              />
            </TextFieldFrame>
          </TextFieldRoot>
        </div>
        <div class="flex w-full flex-row gap-2">
          <TextFieldRoot class="w-full">
            <TextFieldLabel>System version</TextFieldLabel>
            <TextFieldFrame>
              <TextField
                placeholder="15.4"
                value={props.state.systemVersion}
                onInput={e => props.setState('systemVersion', e.currentTarget.value)}
              />
            </TextFieldFrame>
          </TextFieldRoot>
          <TextFieldRoot class="w-full">
            <TextFieldLabel>App version</TextFieldLabel>
            <TextFieldFrame>
              <TextField
                placeholder="4.0.1"
                value={props.state.appVersion}
                onInput={e => props.setState('appVersion', e.currentTarget.value)}
              />
            </TextFieldFrame>
          </TextFieldRoot>
        </div>
        <div class="flex w-full flex-row gap-2">
          <TextFieldRoot class="w-full">
            <TextFieldLabel>System language code</TextFieldLabel>
            <TextFieldFrame>
              <TextField
                placeholder="en"
                value={props.state.systemLangCode}
                onInput={e => props.setState('systemLangCode', e.currentTarget.value)}
              />
            </TextFieldFrame>
          </TextFieldRoot>
          <TextFieldRoot class="w-full">
            <TextFieldLabel>Language code</TextFieldLabel>
            <TextFieldFrame>
              <TextField
                placeholder="en"
                value={props.state.langCode}
                onInput={e => props.setState('langCode', e.currentTarget.value)}
              />
            </TextFieldFrame>
          </TextFieldRoot>
        </div>
        <TextFieldRoot class="w-full">
          <TextFieldLabel>Extra options (JSON)</TextFieldLabel>
          <TextFieldFrame class="h-auto">
            <TextField
              as="textarea"
              class="h-20 resize-none font-mono"
              placeholder={'{"tz_offset": 3600}'}
              value={props.state.extraJson}
              onInput={e => props.setState('extraJson', e.currentTarget.value)}
            />
          </TextFieldFrame>
        </TextFieldRoot>
      </Show>
    </div>
  )
}

export function CustomApiDialog(props: {
  visible: boolean
  setVisible: (visible: boolean) => void
  onSubmit: (options: CustomApiFields) => void
}) {
  const [state, setState] = useCustomApiFormState()

  return (
    <Dialog open={props.visible} onOpenChange={props.setVisible}>
      <DialogContent class="flex flex-col gap-2">
        <DialogHeader class="font-medium">
          Custom connection options
        </DialogHeader>
        <CustomApiForm state={state} setState={setState} />

        <Button
          size="sm"
          disabled={!state.apiId || !state.apiHash}
          onClick={() => props.onSubmit(unwrap(state))}
        >
          Submit
        </Button>
      </DialogContent>
    </Dialog>
  )
}
