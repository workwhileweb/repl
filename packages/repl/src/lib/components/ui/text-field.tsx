import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type {
  TextFieldDescriptionProps,
  TextFieldErrorMessageProps,
  TextFieldInputProps,
  TextFieldLabelProps,
  TextFieldRootProps,
} from '@kobalte/core/text-field'
import type { JSX, ValidComponent, VoidProps } from 'solid-js'
import { useFormControlContext } from '@kobalte/core'
import { TextField as TextFieldPrimitive } from '@kobalte/core/text-field'
import { cva } from 'class-variance-authority'
import { splitProps } from 'solid-js'
import { cn } from '../../utils.ts'

type textFieldProps<T extends ValidComponent = 'div'> =
  TextFieldRootProps<T> & {
    class?: string
  }

export function TextFieldRoot<T extends ValidComponent = 'div'>(props: PolymorphicProps<T, textFieldProps<T>>) {
  const [local, rest] = splitProps(props as textFieldProps, ['class'])

  return <TextFieldPrimitive class={cn('space-y-1', local.class)} {...rest} />
}

export const textfieldLabel = cva(
  'text-sm font-medium data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70',
  {
    variants: {
      label: {
        true: 'data-[invalid]:text-destructive',
      },
      error: {
        true: 'text-xs text-destructive',
      },
      description: {
        true: 'font-normal text-muted-foreground',
      },
    },
    defaultVariants: {
      label: true,
    },
  },
)

type textFieldLabelProps<T extends ValidComponent = 'label'> =
  TextFieldLabelProps<T> & {
    class?: string
  }

export function TextFieldLabel<T extends ValidComponent = 'label'>(props: PolymorphicProps<T, textFieldLabelProps<T>>) {
  const [local, rest] = splitProps(props as textFieldLabelProps, ['class'])

  return (
    <TextFieldPrimitive.Label
      class={cn(textfieldLabel(), local.class)}
      {...rest}
    />
  )
}

type textFieldErrorMessageProps<T extends ValidComponent = 'div'> =
  TextFieldErrorMessageProps<T> & {
    class?: string
  }

export function TextFieldErrorMessage<T extends ValidComponent = 'div'>(props: PolymorphicProps<T, textFieldErrorMessageProps<T>>) {
  const [local, rest] = splitProps(props as textFieldErrorMessageProps, [
    'class',
  ])

  return (
    <TextFieldPrimitive.ErrorMessage
      class={cn(textfieldLabel({ error: true }), local.class)}
      {...rest}
    />
  )
}

type textFieldDescriptionProps<T extends ValidComponent = 'div'> =
  TextFieldDescriptionProps<T> & {
    class?: string
  }

export function TextFieldDescription<T extends ValidComponent = 'div'>(props: PolymorphicProps<T, textFieldDescriptionProps<T>>) {
  const [local, rest] = splitProps(props as textFieldDescriptionProps, [
    'class',
  ])

  return (
    <TextFieldPrimitive.Description
      class={cn(
        textfieldLabel({ description: true, label: false }),
        local.class,
      )}
      {...rest}
    />
  )
}

export interface TextFieldFrameOptions {
  class?: string
  children?: JSX.Element
}

export function TextFieldFrame(props: TextFieldFrameOptions) {
  const context = useFormControlContext()

  return (
    <div
      class={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-shadow focus-within:outline-none focus-within:ring-[1.5px] focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        context.validationState() === 'invalid' && 'border-error-foreground',
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}

type textFieldInputProps<T extends ValidComponent = 'input'> = VoidProps<
  TextFieldInputProps<T> & {
    class?: string
  }
>

export function TextField<T extends ValidComponent = 'input'>(props: PolymorphicProps<T, textFieldInputProps<T>>) {
  const [local, rest] = splitProps(props as textFieldInputProps, ['class'])

  return (
    <TextFieldPrimitive.Input
      class={cn('border-none outline-none placeholder:text-muted-foreground bg-transparent min-w-0 w-full', local.class)}
      {...rest}
    />
  )
}
