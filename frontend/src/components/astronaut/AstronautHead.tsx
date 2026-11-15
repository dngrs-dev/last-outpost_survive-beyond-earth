import type { CrewAppearance } from '../crewAppearance';

export type AstronautMood = 'well' | 'tired' | 'unwell';
export const FACE_PATHS = {
  oval: 'M95 65C94 39 146 39 145 65L143 87Q140 110 120 115Q100 110 97 87Z',
  square: 'M94 65C94 40 146 40 146 65L144 92 134 110Q120 117 106 110L96 92Z',
  tapered: 'M95 65C94 40 146 40 145 65L141 89Q134 112 120 116Q106 112 99 89Z',
};

function Hair({ person }: { person: CrewAppearance }) {
  const shapes = {
    sweep:
      'M92 79Q84 51 100 41 120 29 140 43 154 55 147 80L140 59Q123 66 112 48 106 65 99 63L97 80Z',
    crop: 'M92 77Q85 44 115 38 151 33 149 77L141 58 131 56 125 51 115 57 105 53 99 62 98 78Z',
    bob: 'M92 101Q82 66 92 46 109 27 134 38 155 43 150 100L141 104 140 61Q123 64 110 47 107 62 100 65L100 104Z',
    bun: 'M92 78Q86 44 111 37 141 28 150 54L146 80 140 61Q118 62 110 47 106 60 99 64L98 80Z',
    curls:
      'M91 89Q82 68 89 48 101 28 128 34 152 38 154 61L147 91 140 70 138 58 126 55 114 47 103 57 100 70 98 89Z',
  };
  return (
    <g fill={person.hair} stroke="#28303b" strokeWidth="1.1" data-part="hair">
      <path d={shapes[person.style]} />
      {person.style === 'bun' && <ellipse cx="141" cy="46" rx="10" ry="12" />}
      {person.style === 'curls' && (
        <g>
          <circle cx="95" cy="50" r="7" />
          <circle cx="106" cy="40" r="8" />
          <circle cx="120" cy="38" r="8" />
          <circle cx="135" cy="42" r="8" />
          <circle cx="145" cy="53" r="7" />
        </g>
      )}
      <path
        d="M99 51q7-9 17-10m17 2q8 4 10 11"
        fill="none"
        stroke={person.silver ? '#bcc0be' : '#d8d8cf'}
        strokeOpacity={person.silver ? '.7' : '.14'}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  );
}

export function AstronautHead({
  person,
  mood,
  prefix,
}: {
  person: CrewAppearance;
  mood: AstronautMood;
  prefix: string;
}) {
  const face = FACE_PATHS[person.face || 'oval'];
  const tired = mood !== 'well';
  return (
    <g data-part="shared-head" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M109 102h22v35q-11 8-22 0Z"
        fill={person.shade}
        stroke="#654e45"
        strokeWidth="1"
      />
      <g clipPath={`url(#${prefix}-head-envelope)`}>
        <path
          d="M96 101q-14-35-3-56 16-20 37-9 26 8 18 65Z"
          fill={person.hair}
        />
        <ellipse cx="95" cy="80" rx="5" ry="9" fill={person.skin} />
        <ellipse cx="145" cy="80" rx="5" ry="9" fill={person.skin} />
        <path
          d={face}
          fill={`url(#${prefix}-skin)`}
          stroke={person.shade}
          strokeWidth="1.1"
        />
        <g clipPath={`url(#${prefix}-face)`}>
          <path
            d="M99 85q4 17 16 23m26-23q-4 17-16 23"
            fill="none"
            stroke={person.shade}
            strokeOpacity=".2"
            strokeWidth="5"
          />
          <path
            d="M104 90q4-2 8 0m16 0q4-2 8 0"
            stroke="#b5786f"
            strokeOpacity={mood === 'unwell' ? '.45' : '.15'}
            strokeWidth="5"
          />
          {person.beard && (
            <path
              d="M98 91q7 11 11 8 11 6 22 0 4 3 11-8l-4 14-10 9h-16l-10-9Z"
              fill={person.hair}
              fillOpacity=".58"
            />
          )}
          {person.freckles && (
            <path
              d="M103 87h.1m5 1h.1m24 0h.1m5-1h.1"
              stroke={person.shade}
              strokeWidth="1.5"
            />
          )}
          <path
            d={
              mood === 'unwell'
                ? 'm103 71 9-2m16 0 9 2'
                : 'M103 68q5-3 10 0m14 0q5-3 10 0'
            }
            fill="none"
            stroke={person.hair}
            strokeWidth="2"
          />
          {[108, 132].map((x) => (
            <g key={x}>
              <path
                d={`M${x - 5} 78q5-${tired ? 3 : 5} 10 0-5 ${tired ? 2 : 4}-10 0Z`}
                fill="#e1ded5"
              />
              <ellipse
                cx={x}
                cy="78"
                rx="2.2"
                ry={tired ? 1.7 : 2.8}
                fill={person.eyes}
              />
              <circle cx={x} cy="78" r="1.1" fill="#252b34" />
              <circle cx={x + 0.7} cy="77.2" r=".6" fill="#f0ece3" />
              <path
                d={`M${x - 5} 78q5-${tired ? 3 : 5} 10 0`}
                stroke="#5a514c"
                strokeWidth="1"
                fill="none"
              />
              {tired && (
                <path
                  d={`m${x - 4} 83 8 0`}
                  stroke={person.shade}
                  strokeOpacity=".45"
                  strokeWidth="1"
                />
              )}
            </g>
          ))}
          <path
            d="m119 76-3 14q4 3 8 0"
            fill="none"
            stroke={person.shade}
            strokeWidth="1.2"
          />
          <path
            d="m119 79-1 8"
            stroke="#f2ddc7"
            strokeOpacity=".35"
            strokeWidth="1.3"
          />
          <path
            d={
              mood === 'well'
                ? 'M112 101q8 5 16 0'
                : mood === 'tired'
                  ? 'M113 103h14'
                  : 'M113 104q7-4 14 0'
            }
            stroke="#875b57"
            strokeWidth="1.3"
            fill="none"
          />
          <path
            d="M115 106q5 2 10 0"
            stroke={person.shade}
            strokeOpacity=".3"
            fill="none"
          />
        </g>
        <Hair person={person} />
        {person.glasses && (
          <g
            stroke="#506176"
            strokeWidth="1.4"
            fill="#c7def0"
            fillOpacity=".06"
          >
            <rect x="99" y="71" width="18" height="13" rx="4" />
            <rect x="123" y="71" width="18" height="13" rx="4" />
            <path d="M117 75q3-2 6 0m-28-1 4 1m42 0 4-1" />
          </g>
        )}
      </g>
    </g>
  );
}

export function AstronautHelmet({ prefix }: { prefix: string }) {
  return (
    <g data-part="helmet" stroke="#638198" strokeWidth="1.6">
      <path
        d="M77 78Q77 25 120 25t43 53v21q-3 29-27 34h-32q-24-5-27-34Z"
        fill={`url(#${prefix}-visor)`}
      />
      <path
        d="M82 78q0-47 38-47t38 47v19q-2 24-23 29h-30q-21-5-23-29Z"
        stroke="#d9e5eb"
        strokeOpacity=".46"
        fill="none"
      />
      <path
        d="M87 60q4-16 17-23"
        stroke="#e1f4fb"
        strokeOpacity=".6"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M151 67q5 15 1 29"
        stroke="#c3e5f2"
        strokeOpacity=".22"
        strokeWidth="3"
        fill="none"
      />
      <path d="M76 76h8v26h-8Zm80 0h8v26h-8Z" fill="#8ba5b7" />
      <path d="M79 81v16m82-16v16" stroke="#d5e3e9" strokeWidth="2" />
      <path d="M98 130q22 9 44 0" stroke="#263f55" strokeWidth="4" />
    </g>
  );
}
