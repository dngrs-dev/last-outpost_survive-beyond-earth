import { useId } from 'react';
import { crewAppearance, roleColor } from './crewAppearance';
import {
  AstronautHead,
  AstronautHelmet,
  FACE_PATHS,
  type AstronautMood,
} from './astronaut/AstronautHead';
import { AstronautSuit, type AstronautPose } from './astronaut/AstronautSuit';

export type { AstronautMood } from './astronaut/AstronautHead';

/** One layered rig for every character, portrait, pose, and expression. */
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
  pose?: AstronautPose;
  mood?: AstronautMood;
}) {
  const person = crewAppearance(id);
  const prefix = `astronaut-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      viewBox={portrait ? '64 28 112 140' : '0 0 240 520'}
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-pose={pose}
      data-mood={mood}
    >
      <defs>
        <linearGradient
          id={`${prefix}-cloth`}
          x1="55"
          y1="150"
          x2="175"
          y2="350"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0f2ee" />
          <stop offset=".48" stopColor="#d4dce0" />
          <stop offset="1" stopColor="#aebdc9" />
        </linearGradient>
        <linearGradient
          id={`${prefix}-skin`}
          x1="102"
          y1="48"
          x2="139"
          y2="106"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={person.skin} />
          <stop offset=".6" stopColor={person.skin} />
          <stop offset="1" stopColor={person.shade} />
        </linearGradient>
        <linearGradient
          id={`${prefix}-visor`}
          x1="79"
          y1="37"
          x2="161"
          y2="125"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c3eaf5" stopOpacity=".13" />
          <stop offset=".5" stopColor="#91bdcf" stopOpacity=".015" />
          <stop offset="1" stopColor="#96c9df" stopOpacity=".1" />
        </linearGradient>
        <clipPath id={`${prefix}-head-envelope`}>
          <ellipse cx="120" cy="80" rx="36" ry="49" />
        </clipPath>
        <clipPath id={`${prefix}-face`}>
          <path d={FACE_PATHS[person.face || 'oval']} />
        </clipPath>
      </defs>
      <AstronautHead person={person} mood={mood} prefix={prefix} />
      <AstronautSuit
        prefix={prefix}
        accent={roleColor(role)}
        role={role}
        pose={pose}
      />
      {!portrait && <AstronautHelmet prefix={prefix} />}
    </svg>
  );
}
