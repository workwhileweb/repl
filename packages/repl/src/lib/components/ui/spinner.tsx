import { cn } from '../../utils.ts'

export interface SpinnerProps {
  class?: string
  indeterminate?: boolean
  progress?: number // 0-1
  bgClass?: string
  strokeClass?: string
}
/*
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
} */

const HALF_PI = Math.PI / 2
function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngleRad: number,
  endAngleRad: number,
) {
  const largeArcFlag = endAngleRad - startAngleRad <= Math.PI ? '0' : '1'

  return [
    'M',
    centerX + radius * Math.cos(startAngleRad - HALF_PI),
    centerY + radius * Math.sin(startAngleRad - HALF_PI),
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    1,
    centerX + radius * Math.cos(endAngleRad - HALF_PI),
    centerY + radius * Math.sin(endAngleRad - HALF_PI),
  ].join(' ')
}

export function Spinner(props: SpinnerProps) {
  const progress = () => props.indeterminate ? 0.25 : props.progress ?? 0
  return (
    <svg viewBox="0 0 24 24" class={cn(props.indeterminate && 'animate-spin', props.class)}>
      <circle
        class={cn('fill-transparent stroke-current opacity-10 stroke-2', props.bgClass)}
        cx="12"
        cy="12"
        r="10"
      />
      {progress() >= 1
        ? (
            <circle
              class={cn('stroke-current stroke-2', props.bgClass)}
              cx="12"
              cy="12"
              r="10"
              fill="none"
            />
          )
        : (
            <path
              class={cn('stroke-current stroke-2', props.strokeClass)}
              d={describeArc(12, 12, 10, 0, 2 * Math.PI * progress())}
              fill="none"
              stroke-linecap="round"
            />
          )}
    </svg>
  )
}
