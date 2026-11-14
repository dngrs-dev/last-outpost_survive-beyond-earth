import type { CrewResponse, MedicalKind } from '../types/game';

export interface MedicalTarget { patient_id: string; condition_id: MedicalKind }

export function MedicalAssignmentFields({ worker, self, crew, value, disabled, onChange }: {
  worker: CrewResponse; self: boolean; crew: CrewResponse[]; value?: MedicalTarget;
  disabled: boolean; onChange: (target: MedicalTarget) => void;
}) {
  const targets = crew.filter(c => c.alive && (self ? c.id === worker.id : c.id !== worker.id))
    .flatMap(patient => patient.medical_conditions.map(condition => ({
      patient_id: patient.id, condition_id: condition.kind,
      label: `${patient.name}: ${condition.title}${condition.urgent ? ' (URGENT)' : ''}`,
    })));
  return <div>
    <label>Patient and condition for {worker.name}{' '}
      <select disabled={disabled} value={value ? `${value.patient_id}:${value.condition_id}` : ''} onChange={e => {
        const target = targets.find(t => `${t.patient_id}:${t.condition_id}` === e.target.value);
        if (target) onChange({ patient_id: target.patient_id, condition_id: target.condition_id });
      }}>
        <option value="" disabled>Select a condition</option>
        {targets.map(target => <option key={`${target.patient_id}:${target.condition_id}`} value={`${target.patient_id}:${target.condition_id}`}>{target.label}</option>)}
      </select>
    </label>
    <p>{self ? 'Reserves this astronaut for self-care.' : 'Reserves both caregiver and patient. A medic or retained diagnostic scanner improves recovery.'} Uses 1 medicine; stabilization is guaranteed if care begins. Recovery requires full provisions and safe air.</p>
  </div>;
}
