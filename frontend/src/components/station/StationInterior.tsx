import type { GameStateResponse } from '../../types/game';
import type { RoomActor } from './stationLayout';
import { StationSupplies } from './StationSupplies';

export function StationInterior({ id, state }: { id: string; state: GameStateResponse }) {
  const dark = state.energy.forecast[0]?.phase === 'darkness';
  return <svg viewBox="0 0 1000 760" aria-hidden="true" width="100%" height="100%">
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor={dark ? '#192e42' : '#294459'} /><stop offset="1" stopColor="#0b1726" /></linearGradient>
      <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#243b4d" /><stop offset="1" stopColor="#080f1c" /></linearGradient>
      <linearGradient id={`${id}-seat`} x2="0" y2="1"><stop stopColor="#526f80" /><stop offset="1" stopColor="#203747" /></linearGradient>
    </defs>
    <path d="M35 490V160Q35 35 210 25H790Q965 35 965 160V490Z" fill={`url(#${id}-wall)`} stroke="#476276" strokeWidth="5" />
    <path d="M35 490Q500 365 965 490L1000 760H0Z" fill={`url(#${id}-floor)`} />
    <path d="M65 490V175Q65 65 220 55H780Q935 65 935 175V490M115 475V190Q115 110 225 100H775Q885 110 885 190V475" fill="none" stroke="#3c586c" strokeWidth="8" />
    <path d="M250 75H750" stroke="#a5dce4" strokeWidth="5" strokeLinecap="round" />
    <rect x="365" y="125" width="270" height="130" rx="63" fill="#050e1a" stroke="#5f8298" strokeWidth="4" />
    <path d="M377 232Q490 177 623 234L613 251H387Z" fill={dark ? '#435667' : '#87979c'} />
    <path d="M397 242Q490 211 607 245" fill="none" stroke="#a3b8bd" />
    <circle cx="514" cy="170" r="18" fill="#477da2" stroke="#a5d3dc" />
    <g stroke="#52758a" strokeWidth="3">
      {[250, 460, 670].map((x, index) => <g key={x}>
        <rect x={x - 35} y="240" width="70" height="61" rx="6" fill="#0a2132" />
        <path d={`M${x - 24} 278l12-13 10 8 13-17 12 9`} fill="none" stroke={index === 1 ? '#b3a7e1' : '#83c4cb'} />
        <path d={`M${x} 301v18m-24 0h48`} />
      </g>)}
      <rect x="747" y="252" width="169" height="105" rx="12" fill="#193543" />
      <path d="M768 279h47m-47 15h35m-35 15h42" stroke="#85b6bd" />
      <circle cx="852" cy="285" r="13" fill={state.life_support.co2_burden > state.life_support.co2_warning_level ? '#dcb06f' : '#8ac6b5'} />
      <path d="M846 318h30m-15-15v30" stroke="#92cbb5" strokeWidth="6" />
    </g>
    <StationSupplies state={state} />
    <g stroke="#56778b" strokeWidth="2">
      <rect x="60" y="441" width="185" height="285" rx="16" fill="#06111e" />
      <text x="77" y="462" fill="#b8d4df" fontSize="11" stroke="none" letterSpacing="1.5">SURFACE VIEW</text>
      <path d="M64 559q70-38 177 1v160H64Z" fill="#53616a" stroke="none" />
      <path d="m75 658 30-8 24 8 30-6 30 8 39-9M83 699l31-8 33 9 31-5" stroke="#7a8b94" fill="none" />
      <ellipse cx="150" cy="582" rx="32" ry="11" fill="#35434f" />
      <circle cx="80" cy="487" r="1" fill="#e1ebea" /><circle cx="221" cy="505" r="1" fill="#e1ebea" />
    </g>
    <g fill="#183042" stroke="#668395" strokeWidth="3">
      <path d="M300 347Q480 425 660 347V393Q480 471 300 393Z" />
      <path d="M300 337Q480 407 660 337V360Q480 434 300 360Z" fill={`url(#${id}-seat)`} />
      <path d="M260 530Q480 622 700 530V579Q480 676 260 579Z" />
      <path d="M260 520Q480 601 700 520V549Q480 636 260 549Z" fill={`url(#${id}-seat)`} />
    </g>
    <path d="M270 690 375 655M730 690 625 655M300 760 410 690M700 760 590 690" stroke="#355264" strokeWidth="2" opacity=".5" />
  </svg>;
}

/** Foreground furniture is drawn once, after people; only the table's own footprint occludes them. */
export function StationFurniture({ actors }: { actors: RoomActor[] }) {
  return <svg viewBox="0 0 1000 760" aria-hidden="true" width="100%" height="100%">
    {actors.filter(actor => actor.zone === 'work').map(actor => <g key={actor.crew.id} data-part="work-desk" stroke="#7896a8" strokeWidth="2">
      <path d={`M${actor.left + 4} ${actor.top + 113}h92v14h-92Z`} fill="#526c7c" />
      <path d={`M${actor.left + 10} ${actor.top + 128}v65m80-65v65`} stroke="#3d5c70" strokeWidth="6" />
    </g>)}
    {actors.filter(actor => actor.zone === 'medical' && (actor.activity.kind === 'patient' || actor.activity.pose === 'reclining')).map(actor => {
      const lying = actor.activity.pose === 'reclining';
      const mattressY = actor.top + actor.height * (lying ? .75 : .94);
      return <g key={actor.crew.id} data-part={lying ? 'medical-cot' : 'medical-chair'} stroke="#80a4af" strokeWidth="2">
        <path d={`M${actor.left} ${mattressY}h${actor.width}v13h-${actor.width}Z`} fill="#93b7b8" />
        <path d={`M${actor.left + 12} ${mattressY + 13}v24m${actor.width - 24}-24v24`} stroke="#456779" strokeWidth="5" />
      </g>;
    })}
    <ellipse cx="480" cy="705" rx="140" ry="23" fill="#030a13" opacity=".6" />
    <path d="M460 601H500L515 691Q480 712 445 691Z" fill="#294457" stroke="#526f81" strokeWidth="3" />
    <ellipse cx="480" cy="596" rx="134" ry="49" fill="#1c3547" stroke="#7e9ba9" strokeWidth="3" />
    <ellipse cx="480" cy="586" rx="134" ry="47" fill="#506d7c" stroke="#9ab6c1" strokeWidth="3" />
    <ellipse cx="480" cy="586" rx="84" ry="28" fill="#2e566a" stroke="#82bcc9" strokeWidth="2" />
    <path d="M438 586H522M480 564V608" stroke="#92cfda" opacity=".5" />
    <circle cx="480" cy="586" r="10" fill="#9bd3d7" opacity=".6" />
  </svg>;
}
