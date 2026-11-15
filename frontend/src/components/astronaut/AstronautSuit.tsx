import { RoleIcon } from '../RoleIcon';

export type AstronautPose = 'standing' | 'seated';
interface SuitProps {
  prefix: string;
  accent: string;
  role: string;
  pose: AstronautPose;
}

function Forearm({ prefix, seated }: { prefix: string; seated: boolean }) {
  return (
    <g transform={seated ? 'rotate(-30 61 236)' : undefined}>
      <path
        d="M48 241q12 7 26 0l-4 55q-10 9-24 0Z"
        fill={`url(#${prefix}-cloth)`}
      />
      <path
        d="m49 256 21 3m-22 6 21 3m-22 6 21 3"
        stroke="#a0afb9"
        strokeWidth="1.2"
      />
      <path d="M46 287h25v14H46Z" fill="#465d73" />
      <path d="M47 291h23m-23 5h23" stroke="#869cae" strokeWidth="1.2" />
      <path d="M47 302h22l4 13-3 10H51l-7-8q-6 0-6-7l3-7 5 6Z" fill="#b6c5cc" />
      <path
        d="m51 307 3 12m5-13 2 14m4-14 2 13"
        stroke="#718797"
        strokeWidth="1"
      />
    </g>
  );
}

// A single limb is mirrored across the body's center; all sixteen people wear this rig.
function Arm({
  prefix,
  accent,
  mirror,
  seated,
}: {
  prefix: string;
  accent: string;
  mirror?: boolean;
  seated: boolean;
}) {
  return (
    <g
      transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}
      data-part={mirror ? 'right-arm' : 'left-arm'}
    >
      <path
        d="M80 151q-17-9-24 12l-9 61q-1 13 13 17 14 1 17-12l12-57Z"
        fill={`url(#${prefix}-cloth)`}
      />
      <path
        d="m56 174 23 7m-25 5 23 7m-24 5 22 7"
        stroke="#8c9fad"
        strokeWidth="1.3"
      />
      <path
        d="m51 210 25 6-2 10-25-6Z"
        fill={accent}
        stroke="none"
        opacity=".85"
      />
      <ellipse cx="61" cy="234" rx="14" ry="9" fill="#52677b" />
      <path d="m51 234 21 3m-22 3 20 3" stroke="#9cabb5" strokeWidth="1.4" />
      {!seated && <Forearm prefix={prefix} seated={false} />}
      <path d="M62 155q8-7 17 1" stroke="#f2f5f4" strokeWidth="2" />
    </g>
  );
}

function Leg({
  prefix,
  accent,
  mirror,
  seated,
}: {
  prefix: string;
  accent: string;
  mirror?: boolean;
  seated: boolean;
}) {
  return (
    <g
      transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}
      data-part={mirror ? 'right-leg' : 'left-leg'}
    >
      <path
        d={
          seated
            ? 'M90 280q-16 4-20 28l4 29h39l8-48Z'
            : 'M83 281h34l-2 89q-6 12-29 8l-6-42Z'
        }
        fill={`url(#${prefix}-cloth)`}
      />
      <path
        d={
          seated
            ? 'M79 305q14-5 30 1m-32 9q16-5 31 0'
            : 'M88 312q12 4 23 0m-25 13q13 4 24 0m-23 15 21 2'
        }
        stroke="#9dacb6"
        strokeWidth="1.3"
      />
      <g transform={seated ? 'translate(-8 -43)' : undefined}>
        <path d="M84 365q16-7 31 0v20q-17 8-31 0Z" fill="#738a9c" />
        <path d="M88 371h23m-23 6h23" stroke="#c0cdd3" strokeWidth="1.4" />
        <path d="M84 387q15 6 31 0l-1 70H83Z" fill={`url(#${prefix}-cloth)`} />
        <path d="M84 401h30v9H84Z" fill={accent} stroke="none" opacity=".85" />
        <path
          d="m88 419 21 1m-22 8 22 1m-22 8 22 1"
          stroke="#9baeba"
          strokeWidth="1.3"
        />
        <path d="M83 448h31l1 33H72l-1-12 9-10Z" fill="#586e81" />
        <path d="M81 459h30l3 16H75Z" fill="#93a7b3" />
        <path d="M72 480h44v10H70Z" fill="#334b61" />
        <path d="M76 485h36" stroke="#78909f" strokeWidth="2" />
      </g>
    </g>
  );
}

export function AstronautSuit({ prefix, accent, role, pose }: SuitProps) {
  const seated = pose === 'seated';
  return (
    <g
      stroke="#344b60"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      data-part="shared-suit"
    >
      <rect x="72" y="151" width="96" height="130" rx="16" fill="#627b8f" />
      <path
        d="M76 168h-8v96h8m88-96h8v96h-8"
        stroke="#aac0cd"
        strokeWidth="3"
      />
      <Leg prefix={prefix} accent={accent} seated={seated} />
      <Leg prefix={prefix} accent={accent} seated={seated} mirror />
      <path
        d="M84 266h72l5 30q-13 14-31 11l-10-20-10 20q-18 3-31-11Z"
        fill={`url(#${prefix}-cloth)`}
      />
      <Arm prefix={prefix} accent={accent} seated={seated} />
      <Arm prefix={prefix} accent={accent} seated={seated} mirror />
      <path
        d="M91 144h58l20 20-7 79-6 29H84l-6-29-7-79Z"
        fill={`url(#${prefix}-cloth)`}
      />
      <path
        d="M90 145 85 175l-2 56m67-86 5 30 2 56"
        stroke="#91a6b5"
        strokeWidth="1.4"
      />
      <path
        d="M85 246q35 8 70 0m-71 8q36 8 72 0m-72 8q36 8 72 0"
        stroke="#9aabb7"
        strokeWidth="1.4"
      />
      <path d="M83 269h74v14H83Z" fill="#51697c" />
      <path d="M112 270h16v12h-16Z" fill="#c6d4db" />
      <rect
        data-part="chest-controls"
        x="92"
        y="173"
        width="56"
        height="48"
        rx="8"
        fill="#8ca3b4"
      />
      <rect x="98" y="178" width="44" height="28" rx="4" fill="#344f66" />
      <path
        d="M104 185h17m-17 6h12m-12 6h20"
        stroke="#9bd1e5"
        strokeWidth="2"
      />
      <circle cx="134" cy="187" r="3" fill={accent} stroke="none" />
      <circle cx="104" cy="214" r="2.5" fill="#e1d2aa" />
      <circle cx="116" cy="214" r="2.5" fill="#acbfcd" />
      <path d="M139 215q19 3 16 23l-7 13" stroke="#405c70" strokeWidth="5" />
      <path d="M139 215q19 3 16 23l-7 13" stroke="#a2b9c4" strokeWidth="2.5" />
      <circle cx="92" cy="236" r="6" fill="#506f86" />
      <circle cx="92" cy="236" r="2.5" fill="#afc7d3" />
      <path d="M104 153h32v11h-32Z" fill="#536e82" />
      <path d="M109 158h22" stroke="#c2d1d9" strokeWidth="1" />
      <path d="M158 165h9v23h-9Z" fill={accent} stroke="none" />
      <svg
        x="76"
        y="164"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        color="#4a667c"
      >
        <RoleIcon role={role} />
      </svg>
      <path d="M83 137q37-17 74 0v9q-37 17-74 0Z" fill="#9cb2c2" />
      <path d="M86 136q34 12 68 0" stroke="#3c566c" strokeWidth="4" />
      <path d="M88 145q32 11 64 0" stroke="#e5edef" strokeWidth="2" />
      {seated && (
        <g data-part="front-forearms">
          <Forearm prefix={prefix} seated />
          <g transform="translate(240 0) scale(-1 1)">
            <Forearm prefix={prefix} seated />
          </g>
        </g>
      )}
    </g>
  );
}
