import { RoleIcon } from '../RoleIcon';

export type CabinPose = 'standing' | 'seated' | 'working' | 'treating' | 'reclining';
export type CabinEquipment = 'tablet' | 'tools' | 'medical';

function CabinLeg({ seated, mirror }: { seated: boolean; mirror?: boolean }) {
  return <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
    <path d={seated ? 'M83 268h35l-9 65H76l-7-24Z' : 'M83 268h35l-4 104H83l-6-66Z'} fill="#344a60" />
    <path d={seated ? 'M77 326h32v107H78Z' : 'M83 366h31l-3 107H82Z'} fill="#2b3e52" />
    <path d={seated ? 'M79 427h29l5 22H66v-10Z' : 'M83 467h28l5 22H70v-11Z'} fill="#142636" />
    <path d={seated ? 'M72 449h43M83 341h22' : 'M74 489h44M88 385h21'} stroke="#8297a7" strokeWidth="3" />
    <path d="M85 290h24v27H86Z" fill="#41596c" />
  </g>;
}

function CabinArm({ prefix, accent, bent, mirror }: { prefix: string; accent: string; bent: boolean; mirror?: boolean }) {
  return <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
    <path d="M83 145q-23-1-29 23l-8 64q0 15 18 15 13-1 14-13l10-65Z" fill={`url(#${prefix}-cabin)`} />
    <path d="m52 190 25 4-2 13-24-4Z" fill={accent} stroke="none" opacity=".8" />
    <path d={bent ? 'M49 231q-1 13 12 16l43 10 5-20-40-13Z' : 'M48 231h27l-6 65H48Z'} fill={`url(#${prefix}-cabin)`} />
    <path d={bent ? 'm99 234 10 3-4 24-10-2Z' : 'M48 288h23v10H48Z'} fill="#20384b" />
    <path d={bent ? 'M108 239q12-7 20 2l4 12-10 10-19-5Z' : 'M49 298h19l4 19-6 8H50l-5-13Z'} fill={`url(#${prefix}-skin)`} />
    <path d="m57 174 19 4m-20 38 17 3" stroke="#7994a8" strokeWidth="1.2" />
  </g>;
}

/** Shared cabin garment and limbs; faces and identifying colors come from the avatar rig. */
export function CabinOutfit({ prefix, accent, role, pose, equipment }: {
  prefix: string; accent: string; role: string; pose: CabinPose; equipment?: CabinEquipment;
}) {
  const seated = pose === 'seated' || pose === 'working';
  const bent = seated || pose === 'treating';
  const prop = equipment || (pose === 'working' || pose === 'seated' ? 'tablet' : pose === 'treating' ? 'medical' : undefined);
  return <g data-part="shared-cabin-outfit" stroke="#203449" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
    <CabinLeg seated={seated} /><CabinLeg seated={seated} mirror />
    <path d="M89 134h62l20 24-11 110q-40 17-80 0L69 158Z" fill={`url(#${prefix}-cabin)`} />
    <path d="m90 135 30 21 30-21-9 28h-42Z" fill="#a8b9bd" />
    <path d="M120 155v111M85 252h70" stroke="#91a8b8" strokeWidth="2" />
    <path d="M79 158h21v12H78Zm62 0h21v12h-22Z" fill={accent} stroke="none" />
    <path d="M131 181h24v29h-24Z" fill="#304a5e" />
    <path d="M134 185h18" stroke="#b4cad3" strokeWidth="2" />
    <rect x="86" y="201" width="25" height="8" rx="2" fill="#bed0d6" />
    <svg x="84" y="178" width="23" height="23" viewBox="0 0 24 24" color={accent}><RoleIcon role={role} /></svg>
    <CabinArm prefix={prefix} accent={accent} bent={bent} />
    <CabinArm prefix={prefix} accent={accent} bent={bent} mirror />
    {prop === 'tablet' && <g data-part="cabin-tablet" transform={pose === 'working' ? 'rotate(-7 120 252)' : undefined}>
      <rect x="92" y="231" width="56" height="35" rx="4" fill="#152f44" stroke="#8bb6c8" />
      <path d="M99 240h39m-39 7h27m-27 7h34" stroke="#7bc6d2" strokeWidth="2" />
    </g>}
    {prop === 'medical' && <g data-part="medical-kit">
      <rect x="96" y="234" width="48" height="35" rx="5" fill="#d3ded7" />
      <path d="M111 233v-7h18v7M120 241v20m-10-10h20" stroke="#428e83" strokeWidth="5" />
    </g>}
    {prop === 'tools' && <g data-part="repair-tool">
      <path d="m109 264 23-31m-4 1 2-13 10 1 4 10-12 3" fill="#8dabb8" stroke="#b6d1da" strokeWidth="4" />
    </g>}
  </g>;
}
