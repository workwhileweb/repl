import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { type ComponentProps, splitProps } from 'solid-js'
import { cn } from '../../utils.ts'

export const badgeVariants = cva(
  'inline-flex items-center  border transition-shadow focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
      },
      size: {
        default: 'rounded-md px-2.5 py-0.5 text-xs font-semibold',
        sm: 'rounded-full px-1.5 text-2xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export function Badge(props: ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'size'])

  return (
    <div
      class={cn(
        badgeVariants({
          variant: local.variant,
          size: local.size,
        }),
        local.class,
      )}
      {...rest}
    />
  )
}
