import type { Operator, Vehicle } from "@/lib/api";
import {
  findAssignedOperator,
  getAssignmentActionState,
  getStatusActionState,
} from "@/lib/fleet-actions";
import styles from "./fleet-dashboard.module.css";

type VehicleRowProps = {
  vehicle: Vehicle;
  operators: Operator[];
  selectedOperatorId: string;
  selectedAssignmentId: string | null;
  hasSelectedOperator: boolean;
  pendingKind?: "status" | "takeover" | "release";
  anyPending: boolean;
  onToggleStatus: (vehicle: Vehicle) => void;
  onChangeAssignment: (vehicle: Vehicle) => void;
};

export function VehicleRow({
  vehicle,
  operators,
  selectedOperatorId,
  selectedAssignmentId,
  hasSelectedOperator,
  pendingKind,
  anyPending,
  onToggleStatus,
  onChangeAssignment,
}: VehicleRowProps) {
  const pending = Boolean(pendingKind);
  const assignedOperator = findAssignedOperator(operators, vehicle);
  const assignment = getAssignmentActionState({
    vehicle,
    selectedOperatorId,
    selectedAssignmentId,
    hasSelectedOperator,
    pending,
    pendingKind,
  });
  const status = getStatusActionState({
    vehicle,
    pending: pendingKind === "status",
    anyPending,
  });
  const hintId = `${vehicle.id}-action-hint`;
  const hint = assignment.reason ?? status.reason;

  return (
    <article className={styles.vehicleRow}>
      <div className={styles.vehicleIdentity}>
        <p className={styles.vehicleCode}>{vehicle.code}</p>
        <h3>{vehicle.name}</h3>
      </div>

      <div className={styles.statusGroup}>
        <div className={styles.statusItem}>
          <span className={styles.statusCaption}>Connection</span>
          <span
            className={styles.statusValue}
            data-status={vehicle.isOnline ? "online" : "offline"}
          >
            <span className={styles.statusDot} aria-hidden="true" />
            {vehicle.isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusCaption}>Assignment</span>
          <span className={styles.assignmentValue}>
            {assignedOperator?.name ??
              (vehicle.assignedOperatorId ? "Assigned" : "Available")}
          </span>
        </div>
      </div>

      <div className={styles.actionGroup}>
        <div>
          <button
            className={styles.statusButton}
            type="button"
            disabled={status.disabled}
            onClick={() => onToggleStatus(vehicle)}
            aria-label={`${status.label} for ${vehicle.code}`}
            aria-describedby={status.reason ? hintId : undefined}
            title={status.reason}
          >
            {status.label}
          </button>
        </div>
        <div>
          <button
            className={styles.assignmentButton}
            data-action={assignment.action}
            type="button"
            disabled={assignment.disabled}
            onClick={() => onChangeAssignment(vehicle)}
            aria-label={`${assignment.label} ${vehicle.code}`}
            aria-describedby={assignment.reason ? hintId : undefined}
            title={assignment.reason}
          >
            {assignment.label}
          </button>
        </div>
      </div>
      {hint ? (
        <p className={styles.srOnly} id={hintId}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}
