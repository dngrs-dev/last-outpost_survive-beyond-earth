import type { GameStateResponse } from '../../types/game';
import { roomLayout, type RoomActor } from './stationLayout';
import { StationSupplies } from './StationSupplies';

function Bench({ tier, id }: { tier: ReturnType<typeof roomLayout>['tiers'][number]; id: string }) {
  const { cx, y, half, curve } = tier;
  return <g data-part="curved-bench" stroke="#66818e" strokeWidth="3">
    <path d={`M${cx-half} ${y+90}Q${cx} ${y-curve*2+90} ${cx+half} ${y+90}V${y+110}Q${cx} ${y-curve*2+110} ${cx-half} ${y+110}Z`} fill="#07151f" opacity=".65" stroke="none" />
    <path d={`M${cx-half} ${y-82}Q${cx} ${y-curve*2-82} ${cx+half} ${y-82}V${y+5}Q${cx} ${y-curve*2+5} ${cx-half} ${y+5}Z`} fill={`url(#${id}-seat)`} />
    <path d={`M${cx-half} ${y-32}Q${cx} ${y-curve*2-32} ${cx+half} ${y-32}`} fill="none" stroke="#405b6b" strokeWidth="2" />
    <path d={`M${cx-half} ${y}Q${cx} ${y-curve*2} ${cx+half} ${y}L${cx+half+12} ${y+28}Q${cx} ${y-curve*2+28} ${cx-half-12} ${y+28}Z`} fill="#526e7b" />
    <path d={`M${cx-half-12} ${y+28}Q${cx} ${y-curve*2+28} ${cx+half+12} ${y+28}V${y+65}Q${cx} ${y-curve*2+65} ${cx-half-12} ${y+65}Z`} fill="#263f50" />
    <path d={`M${cx-half+20} ${y+65}v35m${half*2-40}-35v35`} stroke="#1c2d3a" strokeWidth="12" />
  </g>;
}
export function StationInterior({ id, state, portrait = false }: { id: string; state: GameStateResponse; portrait?: boolean; stageHeight?: number }) {
  const layout = roomLayout(portrait), { height, floor } = layout;
  return <svg viewBox={`0 0 1000 ${height}`} aria-hidden="true" width="100%" height="100%">
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor="#435a69" /><stop offset="1" stopColor="#172d3e" /></linearGradient>
      <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#405567" /><stop offset="1" stopColor="#132531" /></linearGradient>
      <linearGradient id={`${id}-seat`} x2="0" y2="1"><stop stopColor="#748993" /><stop offset="1" stopColor="#415767" /></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="#c2dee1" stopOpacity=".1" /><stop offset="1" stopOpacity="0" /></radialGradient>
    </defs>
    <path d={`M20 ${floor+100}V150Q20 30 180 20H820Q980 30 980 150V${floor+100}Z`} fill={`url(#${id}-wall)`} stroke="#617c8e" strokeWidth="7" />
    <path d={`M20 ${floor}Q500 ${floor-140} 980 ${floor}L1000 ${height}H0Z`} fill={`url(#${id}-floor)`} />
    <path d={`M40 ${floor}V160Q40 55 190 45H810Q960 55 960 160V${floor}`} fill="none" stroke="#243c4f" strokeWidth="13" />
    {[240, 760].map(x => <path key={x} d={`M${x} 80V${floor-50}`} stroke="#5b7383" strokeWidth="5" />)}
    <path d="M280 80H720" stroke="#c1e6e5" strokeWidth="7" strokeLinecap="round" />
    <rect x="345" y="130" width="310" height="143" rx="65" fill="#0a1520" stroke="#182c3c" strokeWidth="17" />
    <rect x="345" y="130" width="310" height="143" rx="65" fill="none" stroke="#8197a0" strokeWidth="4" />
    <path d="M357 245q140-65 285 0l-10 17H368Z" fill="#919d9c" /><path d="M372 251q130-42 256 2" fill="none" stroke="#b9c1ba" />
    <circle cx="522" cy="185" r="19" fill="#4f93b8" /><path d="m514 173 12 9-7 13 12 5" stroke="#d4e2da" strokeWidth="4" fill="none" />
    <g transform={portrait ? 'translate(0 230)' : undefined}><StationSupplies state={state} /></g>
    <g transform={`translate(55 ${portrait ? 880 : 515})`} stroke="#5e7c8e" strokeWidth="3">
      <ellipse cx="90" cy="253" rx="96" ry="15" fill="#081520" stroke="none" opacity=".7" />
      <rect width="175" height="245" rx="24" fill="#112536" /><rect x="15" y="18" width="145" height="216" rx="16" fill="#2e4a5d" />
      <path d="M87 20v211M29 38h116v175H29Z" fill="none" /><rect x="110" y="110" width="23" height="44" rx="5" fill="#8ca5ac" /><circle cx="121" cy="123" r="4" fill="#b4edbd" />
      <path d="M23 241h130" stroke="#879ca3" strokeWidth="8" />
    </g>
    {layout.tiers.map((tier, index) => <g key={index}>
      <path d={`M220 ${tier.y+100}Q500 ${tier.y-tier.curve*2+100} 780 ${tier.y+100}`} fill="none" stroke="#122c3c" strokeWidth="12" />
      <Bench tier={tier} id={id} />
    </g>)}
    <path d={`M500 ${floor+50}V${height}M350 ${floor+50} 130 ${height}M650 ${floor+50} 870 ${height}`} stroke="#8196a0" strokeWidth="2" opacity=".13" />
    <ellipse cx="500" cy={height*.55} rx="460" ry={height*.5} fill={`url(#${id}-light)`} />
  </svg>;
}

/** Desks and cots share their actor anchors; foreground tops cover only hands/legs. */
export function StationFurniture({ actors, portrait = false }: { actors: RoomActor[]; portrait?: boolean; stageHeight?: number }) {
  const layout = roomLayout(portrait), table = layout.table;
  return <svg viewBox={`0 0 1000 ${layout.height}`} aria-hidden="true" width="100%" height="100%">
    {actors.filter(actor => actor.zone === 'work').map(actor => {
      const x = actor.left, y = actor.top + actor.height*.51, w = actor.width;
      return <g key={actor.crew.id} data-part="work-desk" stroke="#75929e" strokeWidth="2">
        <ellipse cx={x+w/2} cy={y+actor.height*.39} rx={w*.65} ry="12" fill="#0d1f2b" stroke="none" />
        <path d={`M${x-5} ${y}h${w+10}v12H${x-5}Z`} fill="#708894" /><path d={`M${x+3} ${y+12}v${actor.height*.35}m${w-6} ${-actor.height*.35}v${actor.height*.35}`} stroke="#294454" strokeWidth="8" />
        <path d={`M${x+w*.6} ${y}v-6`} strokeWidth="5" /><rect x={x+w*.35} y={y-43} width={w*.55} height="36" rx="3" fill="#183a4a" /><path d={`M${x+w*.4} ${y-20}l10-9 10 5 8-12`} stroke="#a3e3d5" fill="none" />
      </g>;
    })}
    {actors.filter(actor => actor.zone === 'medical' && actor.activity.kind === 'patient').map(actor => {
      const lying = actor.activity.pose === 'reclining';
      const y = actor.top + actor.height*(lying ? .75 : .53), x = actor.left;
      return <g key={actor.crew.id} data-part={lying ? 'medical-cot' : 'medical-chair'} stroke="#87a5ab" strokeWidth="2">
        <ellipse cx={x+actor.width/2} cy={y+40} rx={actor.width*.55} ry="12" fill="#0a1c27" stroke="none" />
        <path d={`M${x} ${y}h${actor.width}v13H${x}Z`} fill="#bed1cb" /><path d={`M${x+12} ${y+13}v30m${actor.width-24}-30v30`} stroke="#3d5665" strokeWidth="7" />
      </g>;
    })}
    <g transform={`translate(${table.x} ${table.y}) scale(${table.width/137})`} stroke="#839da6" strokeWidth="3">
      <ellipse cy="91" rx="146" ry="25" fill="#081823" stroke="none" opacity=".7" /><path d="M-22 8H22L35 78Q0 100-35 78Z" fill="#294757" />
      <ellipse cy="9" rx="137" ry="49" fill="#213e50" /><ellipse rx="137" ry="46" fill="#637d87" /><ellipse rx="115" ry="34" fill="#405f70" stroke="#6d959f" strokeWidth="2" />
      <rect x="-40" y="-60" width="73" height="45" rx="4" fill="#132d3e" /><path d="m-39-14-13 17h98L33-14Z" fill="#98acb2" /><path d="m-30-29 12-13 12 8 12-13 15 10" stroke="#ade9d9" fill="none" />
      <rect x="60" y="-8" width="38" height="27" rx="4" fill="#204b5a" stroke="#89c8be" /><path d="M68 0h22M68 8h17" stroke="#9ddbc6" strokeWidth="2" />
    </g>
  </svg>;
}
