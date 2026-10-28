import { SVGProps } from 'react'

/**
 * Technical vector milestone trophy mapping asset compliant with simple-maps overlays.
 */
export default function TrophyMarker(props: SVGProps<SVGSVGElement>) {
  return (
    <g
      transform="translate(-8, -15) scale(0.85)"
      className="pointer-events-none drop-shadow-[0_2px_10px_rgba(234,179,8,0.4)]"
      {...props}
    >
      <path
        d="M6 2h12v4c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V2z"
        fill="#eab308"
        stroke="#020617"
        strokeWidth="1.5"
      />
      <path
        d="M4 6a2 2 0 1 1 0-4h2v4H4zM20 6V2h2a2 2 0 1 1 0 4h-2z"
        fill="#eab308"
        stroke="#020617"
        strokeWidth="1.5"
      />
      <path
        d="M12 10v4M10 14h4M8 18h8v2H8z"
        stroke="#eab308"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  )
}
