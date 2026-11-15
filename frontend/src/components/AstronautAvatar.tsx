import { useId } from 'react';
import { crewAppearance, roleColor } from './crewAppearance';
import { RoleIcon } from './RoleIcon';

export type AstronautMood = 'well' | 'tired' | 'unwell';

/** Shared face and suit rig. Pose/mood are presentation inputs, never health rules. */
export function AstronautAvatar({
  id,
  role,
  portrait = false,
  pose = 'standing',
  mood = 'well',
}: {
  id: string;
  role: string;
  portrait?: boolean;
  pose?: 'standing' | 'seated';
  mood?: AstronautMood;
}) {
  const person = crewAppearance(id);
  const accent = roleColor(role);
  const uid = useId().replace(/:/g, '');
  const seated = pose === 'seated';
  return (
    <svg
      viewBox={portrait ? '32 16 136 146' : '0 0 200 382'}
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-pose={pose}
      data-mood={mood}
    >
      <defs>
        <linearGradient
          id={`${uid}suit`}
          x1="50"
          y1="140"
          x2="150"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#edf7fa" />
          <stop offset="1" stopColor="#98b7ca" />
        </linearGradient>
        <linearGradient
          id={`${uid}glass`}
          x1="48"
          y1="20"
          x2="155"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b3ebff" stopOpacity=".2" />
          <stop offset=".65" stopColor="#b3ebff" stopOpacity="0" />
          <stop offset="1" stopColor="#b3ebff" stopOpacity=".14" />
        </linearGradient>
      </defs>
      <g stroke="#273a51" strokeWidth="3" strokeLinejoin="round">
        {!portrait && (
          <>
            <rect
              x="53"
              y="145"
              width="94"
              height="106"
              rx="23"
              fill="#738da7"
            />
            <path
              d="M63 155H51v54h12m74-54h12v54h-12"
              stroke="#a5c3d4"
              strokeWidth="8"
            />
            <g data-part="left-leg">
              <path
                d={
                  seated
                    ? 'M67 237q-23 0-24 21l5 19 3 52h30l4-51 13-34Z'
                    : 'm64 239 34 3-4 77-8 28H59l4-36Z'
                }
                fill={`url(#${uid}suit)`}
              />
              {seated && (
                <ellipse cx="66" cy="269" rx="19" ry="8" fill="#89a8bf" />
              )}
              <path
                d={seated ? 'M50 289h33v13H50' : 'M62 294h33v13H62'}
                fill={accent}
              />
              <path
                d={
                  seated ? 'M50 319h31l2 23H39v-10Z' : 'M59 333h30l1 23H48v-10Z'
                }
                fill="#4b647e"
              />
              <path
                d={seated ? 'M39 338h44' : 'M48 352h42'}
                stroke="#89a6ba"
                strokeWidth="7"
              />
            </g>
            <g data-part="right-leg">
              <path
                d={
                  seated
                    ? 'M102 244l13 34 4 51h30l3-52 5-19q-1-21-24-21Z'
                    : 'm102 242 34-3 1 72 4 36h-27l-8-28Z'
                }
                fill={`url(#${uid}suit)`}
              />
              {seated && (
                <ellipse cx="134" cy="269" rx="19" ry="8" fill="#89a8bf" />
              )}
              <path
                d={seated ? 'M117 289h33v13h-33' : 'M105 294h33v13h-33'}
                fill={accent}
              />
              <path
                d={
                  seated
                    ? 'M119 319h31l11 13v10h-44Z'
                    : 'M111 333h30l11 13v10h-42Z'
                }
                fill="#4b647e"
              />
              <path
                d={seated ? 'M117 338h44' : 'M110 352h42'}
                stroke="#89a6ba"
                strokeWidth="7"
              />
            </g>
          </>
        )}
        <path
          d="M68 132h64q13 0 19 25l-5 78q-46 19-92 0l-5-78q6-25 19-25Z"
          fill={`url(#${uid}suit)`}
        />
        <path d="M54 225q46 12 92 0v15q-46 17-92 0Z" fill="#4d6680" />
        <path
          d="M58 141 45 145q-9 3-12 18l-8 59q-2 13 10 16t16-10l10-56m81-31 13 4q9 3 12 18l8 59q2 13-10 16t-16-10l-10-56"
          fill={`url(#${uid}suit)`}
        />
        <path d="m29 209 23 5m96 0 23-5" stroke={accent} strokeWidth="12" />
        <path
          d="M25 226q-7 18 2 24 12 6 17-10l4-10m104 0 4 10q5 16 17 10 9-6 2-24"
          fill="#57728c"
        />
        <rect x="74" y="161" width="52" height="42" rx="12" fill="#38536d" />
        <path d="M83 172h21m-21 9h13" stroke="#9cd4e7" strokeWidth="4" />
        <circle cx="113" cy="184" r="4" fill={accent} stroke="none" />
        <path d="M100 203v23" stroke="#e9f5f5" strokeWidth="4" />
        <rect
          x="127"
          y="153"
          width="14"
          height="20"
          rx="5"
          fill={accent}
          stroke="none"
        />
        <ellipse cx="100" cy="130" rx="40" ry="14" fill="#6c8fa9" />
        <ellipse cx="100" cy="124" rx="35" ry="10" fill="#d5e9ee" />
        <path d="M87 105h26v22q-13 13-26 0Z" fill={person.shade} />
        {person.style === 'bun' && (
          <circle cx="131" cy="40" r="17" fill={person.hair} />
        )}
        <ellipse cx="62" cy="77" rx="8" ry="12" fill={person.skin} />
        <ellipse cx="138" cy="77" rx="8" ry="12" fill={person.skin} />
        <path
          d="M62 62q0-36 38-36t38 36v22q-1 34-38 36-37-2-38-36Z"
          fill={person.skin}
        />
        {person.style === 'sweep' && (
          <path
            d="M61 71q-5-29 17-43 28-14 51 5 14 11 10 38l-10-20q-15 4-27-9-10 17-32 13l-5 19Z"
            fill={person.hair}
          />
        )}
        {person.style === 'bob' && (
          <path
            d="M60 84q-10-38 11-54 26-20 53-2 25 15 15 62l-10-4V53q-20 3-34-14-7 15-24 18l1 28-12 5Z"
            fill={person.hair}
          />
        )}
        {person.style === 'crop' && (
          <path
            d="M60 64q-2-35 38-39 41 0 42 39l-10-14-8 4-10-10-13 8-12-9-13 10-4 15Z"
            fill={person.hair}
          />
        )}
        {person.style === 'bun' && (
          <path
            d="M60 68q-6-44 40-43 45 0 40 43l-12-17q-18 0-29-13-8 13-27 15l-9 17Z"
            fill={person.hair}
          />
        )}
        {person.style === 'curls' && (
          <g fill={person.hair}>
            <path d="M60 72q-8-45 38-46 49-3 42 46l-13-22H75Z" />
            <circle cx="67" cy="46" r="13" />
            <circle cx="82" cy="32" r="13" />
            <circle cx="102" cy="28" r="13" />
            <circle cx="121" cy="34" r="13" />
            <circle cx="135" cy="49" r="13" />
          </g>
        )}
        <path
          d={
            mood === 'unwell'
              ? 'm75 68 12-3m26 0 12 3'
              : 'M75 65q6-4 12-1m26 0q6-3 12 1'
          }
          stroke={person.hair}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <g stroke="none">
          <ellipse
            cx="81"
            cy="78"
            rx="6"
            ry={mood === 'well' ? 7 : 4}
            fill="#faf8f0"
          />
          <ellipse
            cx="119"
            cy="78"
            rx="6"
            ry={mood === 'well' ? 7 : 4}
            fill="#faf8f0"
          />
          <ellipse
            cx="82"
            cy="79"
            rx="3.3"
            ry={mood === 'well' ? 5 : 3}
            fill={person.eyes}
          />
          <ellipse
            cx="118"
            cy="79"
            rx="3.3"
            ry={mood === 'well' ? 5 : 3}
            fill={person.eyes}
          />
          <circle cx="82" cy="79" r="1.8" fill="#263348" />
          <circle cx="118" cy="79" r="1.8" fill="#263348" />
          <circle cx="83" cy="77" r="1" fill="white" />
          <circle cx="119" cy="77" r="1" fill="white" />
          <ellipse
            cx="73"
            cy="93"
            rx="8"
            ry="4"
            fill="#de837d"
            opacity={mood === 'unwell' ? '.65' : '.3'}
          />
          <ellipse
            cx="127"
            cy="93"
            rx="8"
            ry="4"
            fill="#de837d"
            opacity={mood === 'unwell' ? '.65' : '.3'}
          />
          {person.freckles && (
            <path
              d="M72 89h2m4 1h1m42 0h1m4-1h2"
              stroke={person.shade}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </g>
        <path
          d="m98 82-3 9h6"
          stroke={person.shade}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={
            mood === 'well'
              ? 'M88 101q12 12 24 0'
              : mood === 'tired'
                ? 'M93 104h14'
                : 'M91 106q9-7 18 0'
          }
          stroke="#784b4b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {person.glasses && (
          <g stroke="#40556c" strokeWidth="2.5">
            <rect x="70" y="70" width="24" height="18" rx="7" />
            <rect x="106" y="70" width="24" height="18" rx="7" />
            <path d="M94 76q6-4 12 0M64 73l6 2m60 0 6-2" />
          </g>
        )}
        {!portrait && (
          <>
            <path
              d="M48 72q-1-60 52-60t52 60q0 54-52 54T48 72Z"
              fill={`url(#${uid}glass)`}
              stroke="#b7d6e9"
              strokeOpacity=".65"
              strokeWidth="2"
            />
            <path
              d="M57 52q5-22 25-27"
              stroke="#e6f8ff"
              strokeOpacity=".65"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
      <svg
        x="52"
        y="152"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        color={accent}
      >
        <RoleIcon role={role} />
      </svg>
    </svg>
  );
}
