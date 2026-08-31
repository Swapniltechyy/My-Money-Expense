import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function wrap(
  props: IconProps,
  path: ReactNode,
) {
  const { size = 22, ...rest } = props
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {path}
    </svg>
  )
}

export function IconMenu(p: IconProps) {
  return wrap(p, <path d="M4 7h16M4 12h16M4 17h16" />)
}
export function IconChart(p: IconProps) {
  return wrap(
    p,
    <>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M20 19H4" />
    </>,
  )
}
export function IconCalendar(p: IconProps) {
  return wrap(
    p,
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </>,
  )
}
export function IconEdit(p: IconProps) {
  return wrap(p, <path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />)
}
export function IconPlus(p: IconProps) {
  return wrap(p, <path d="M12 5v14M5 12h14" />)
}
export function IconHome(p: IconProps) {
  return wrap(p, <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" />)
}
export function IconHistory(p: IconProps) {
  return wrap(
    p,
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>,
  )
}
export function IconSettings(p: IconProps) {
  return wrap(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  )
}
export function IconBack(p: IconProps) {
  return wrap(p, <path d="M15 5l-7 7 7 7" />)
}
export function IconMore(p: IconProps) {
  return wrap(
    p,
    <>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </>,
  )
}
export function IconSearch(p: IconProps) {
  return wrap(
    p,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>,
  )
}
export function IconClose(p: IconProps) {
  return wrap(p, <path d="M6 6l12 12M18 6L6 18" />)
}
export function IconWallet(p: IconProps) {
  return wrap(
    p,
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>,
  )
}
export function IconCheck(p: IconProps) {
  return wrap(p, <path d="M5 12.5l5 5L19 7" />)
}
export function IconPeople(p: IconProps) {
  return wrap(
    p,
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16.2 14.2c2.2.5 3.8 2.2 3.8 4.8" />
    </>,
  )
}
