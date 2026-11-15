import { ItemIcon } from '../ItemIcon';
import type { GameStateResponse } from '../../types/game';
import { supplyDisplay } from './stationPresentation';

function RackItem({ item, amount, x, y }: { item: string; amount: number; x: number; y: number }) {
  return <g data-stock={item} data-quantity={amount} opacity={amount > 0 ? 1 : .2}>
    <svg x={x} y={y} width="34" height="34"><ItemIcon id={item} /></svg>
    <text x={x + 31} y={y + 31} fill="#d9e7ed" fontSize="11" stroke="none" textAnchor="end">{amount}</text>
  </g>;
}

export function StationSupplies({ state }: { state: GameStateResponse }) {
  const food = supplyDisplay(state, 'food');
  const water = supplyDisplay(state, 'water');
  const oxygen = supplyDisplay(state, 'oxygen');
  const battery = Math.max(0, Math.min(1, state.energy.stored / Math.max(1, state.energy.battery_capacity)));
  return <g data-part="station-supplies" stroke="#456377" strokeWidth="2">
    <rect x="68" y="150" width="164" height="325" rx="12" fill="#102535" />
    <text x="82" y="172" fill="#a8c5d2" fontSize="12" letterSpacing="2" stroke="none">STORES</text>
    <path d="M77 216H223M77 255H223M77 343H223M77 384H223" />
    <g data-stock="food" data-quantity={food.amount} data-display-count={food.visible}>
      {Array.from({ length: food.visible }, (_, index) => <g key={index} data-part="food-pouch" transform={`translate(${83 + index % 4 * 35} ${183 + Math.floor(index / 4) * 39})`}>
        <rect width="26" height="29" rx="4" fill="#bdad85" /><path d="M4 5H22M5 24H21" stroke="#e4d4ab" /><rect x="7" y="10" width="12" height="7" rx="2" fill="#6b7e7a" stroke="none" />
      </g>)}
      <text x="218" y="252" textAnchor="end" fill="#efdfb7" stroke="none" fontSize="11">{Number(food.amount.toFixed(1))}u</text>
    </g>
    {[{ id: 'water', stock: water, x: 86, color: '#72bad2', label: 'H₂O' }, { id: 'oxygen', stock: oxygen, x: 160, color: '#8ac9b8', label: 'O₂' }].map(tank => <g key={tank.id} data-stock={tank.id} data-quantity={tank.stock.amount} data-fill={tank.stock.fraction}>
      <rect x={tank.x} y="267" width="45" height="64" rx="9" fill="#10202c" />
      <rect x={tank.x + 5} y={325 - tank.stock.fraction * 51} width="35" height={tank.stock.fraction * 51} rx="4" fill={tank.color} opacity=".7" stroke="none" />
      <text x={tank.x + 22} y="292" textAnchor="middle" fontSize="11" fill="#e3f2f5" stroke="none">{tank.label}</text>
      <text x={tank.x + 22} y="322" textAnchor="middle" fontSize="11" fill="#e3f2f5" stroke="none">{Number(tank.stock.amount.toFixed(1))}u</text>
    </g>)}
    {(['medicine', 'repair_kits'] as const).map((resource, row) => <g key={resource} data-stock={resource} data-quantity={state.resources[resource] || 0}>
      {Array.from({ length: Math.min(3, Math.ceil(state.resources[resource] || 0)) }, (_, index) => <g key={index} data-part={`${resource}-pack`}>
        <rect x={83 + row * 73 + index * 13} y={357 - index * 2} width="25" height="20" rx="3" fill={row ? '#bba489' : '#acd0bd'} />
        {row === 0 && <path d={`M${95 + index * 13} ${360 - index * 2}v13m-6-6h12`} stroke="#427b6e" strokeWidth="3" />}
      </g>)}
      <text x={row ? 218 : 144} y="378" fontSize="11" textAnchor="end" fill="#d8e5e6" stroke="none">{state.resources[resource] || 0}</text>
    </g>)}
    <RackItem item="eva_batteries" amount={state.resources.eva_batteries || 0} x={83} y={387} />
    <RackItem item="dust_kits" amount={state.resources.dust_kits || 0} x={135} y={387} />
    <RackItem item="sealant_packs" amount={state.resources.sealant_packs || 0} x={187} y={387} />
    <RackItem item="scientific_tools" amount={state.resources.scientific_tools || 0} x={83} y={432} />
    <RackItem item="diagnostic_tools" amount={state.resources.diagnostic_tools || 0} x={135} y={432} />
    <RackItem item="oxygen_regulators" amount={state.resources.oxygen_regulators || 0} x={187} y={432} />
    <path d="M80 475v25m140-25v25M76 430h148" stroke="#587586" strokeWidth="5" />
    <g data-stock="battery" data-quantity={state.energy.stored} data-fill={battery}>
      <rect x="742" y="168" width="141" height="62" rx="8" fill="#142b39" />
      <text x="752" y="187" fill="#c8dcdf" fontSize="11" letterSpacing="1" stroke="none">BATTERY</text>
      <rect x="752" y="198" width="120" height="15" rx="3" fill="#0a1823" />
      <rect x="752" y="198" width={120 * battery} height="15" rx="3" fill={battery > .25 ? '#88ccba' : '#d6ad70'} stroke="none" />
    </g>
  </g>;
}
