import type { Operator, Vehicle } from "@/lib/api";
import styles from "./fleet-dashboard.module.css";

type OperatorPickerProps = {
  operators: Operator[];
  vehicles: Vehicle[];
  selectedOperatorId: string;
  selectedAssignment: Vehicle | undefined;
  disabled: boolean;
  onChange: (operatorId: string) => void;
};

export function OperatorPicker({
  operators,
  vehicles,
  selectedOperatorId,
  selectedAssignment,
  disabled,
  onChange,
}: OperatorPickerProps) {
  return (
    <section className={styles.operatorPanel} aria-label="Active operator">
      <div className={styles.operatorField}>
        <label htmlFor="active-operator">Active operator</label>
        <select
          id="active-operator"
          value={selectedOperatorId}
          onChange={(event) => onChange(event.target.value)}
          disabled={operators.length === 0 || disabled}
        >
          {operators.length === 0 ? (
            <option value="">No operators available</option>
          ) : null}
          {operators.map((operator) => {
            const assignment = vehicles.find(
              (vehicle) => vehicle.assignedOperatorId === operator.id,
            );
            return (
              <option value={operator.id} key={operator.id}>
                {operator.name} ({operator.employeeId})
                {assignment ? ` - ${assignment.code}` : ""}
              </option>
            );
          })}
        </select>
      </div>
      <div className={styles.operatorContext}>
        <span>Current assignment</span>
        <strong>
          {selectedAssignment
            ? `${selectedAssignment.code} - ${selectedAssignment.name}`
            : "No vehicle assigned"}
        </strong>
        <p>
          {selectedAssignment
            ? "Release this vehicle before taking over another one."
            : "This operator can take over an online, available vehicle."}
        </p>
      </div>
    </section>
  );
}
