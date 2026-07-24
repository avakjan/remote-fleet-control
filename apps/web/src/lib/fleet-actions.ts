import type { Operator, Vehicle } from "@/lib/api";

export type AssignmentAction = "takeover" | "release";

export type AssignmentActionState = {
  action: AssignmentAction;
  label: string;
  disabled: boolean;
  reason?: string;
};

export type StatusActionState = {
  label: string;
  disabled: boolean;
  reason?: string;
  nextOnline: boolean;
};

export function getAssignmentActionState(input: {
  vehicle: Vehicle;
  selectedOperatorId: string;
  selectedAssignmentId: string | null;
  hasSelectedOperator: boolean;
  pending: boolean;
  pendingKind?: "status" | "takeover" | "release";
}): AssignmentActionState {
  const {
    vehicle,
    selectedOperatorId,
    selectedAssignmentId,
    hasSelectedOperator,
    pending,
    pendingKind,
  } = input;

  const ownedBySelected = vehicle.assignedOperatorId === selectedOperatorId;
  const action: AssignmentAction = ownedBySelected ? "release" : "takeover";
  const assignedElsewhere =
    Boolean(vehicle.assignedOperatorId) && !ownedBySelected;
  const operatorBusy =
    Boolean(selectedAssignmentId) && selectedAssignmentId !== vehicle.id;

  if (pending && pendingKind && pendingKind !== "status") {
    return {
      action,
      label: pendingKind === "release" ? "Releasing..." : "Taking over...",
      disabled: true,
    };
  }

  if (!hasSelectedOperator) {
    return {
      action,
      label: "Select operator",
      disabled: true,
      reason: "Select an operator before changing an assignment.",
    };
  }

  if (assignedElsewhere) {
    return {
      action,
      label: "In use",
      disabled: true,
      reason: "Select the assigned operator to release it.",
    };
  }

  if (!ownedBySelected && !vehicle.isOnline) {
    return {
      action,
      label: "Offline",
      disabled: true,
      reason: "Only online vehicles can be taken over.",
    };
  }

  if (!ownedBySelected && operatorBusy) {
    return {
      action,
      label: "Operator busy",
      disabled: true,
      reason: "Release the operator's current vehicle first.",
    };
  }

  return {
    action,
    label: ownedBySelected ? "Release" : "Take over",
    disabled: pending,
  };
}

export function getStatusActionState(input: {
  vehicle: Vehicle;
  pending: boolean;
  anyPending: boolean;
}): StatusActionState {
  const { vehicle, pending, anyPending } = input;
  const nextOnline = !vehicle.isOnline;
  const assignedBlocksOffline =
    vehicle.isOnline && Boolean(vehicle.assignedOperatorId);

  if (pending) {
    return {
      label: "Saving...",
      disabled: true,
      nextOnline,
    };
  }

  if (assignedBlocksOffline) {
    return {
      label: "Set offline",
      disabled: true,
      nextOnline,
      reason: "Release the vehicle before taking it offline.",
    };
  }

  return {
    label: `Set ${vehicle.isOnline ? "offline" : "online"}`,
    disabled: anyPending,
    nextOnline,
  };
}

export function findAssignedOperator(
  operators: Operator[],
  vehicle: Vehicle,
): Operator | undefined {
  return operators.find(
    (operator) => operator.id === vehicle.assignedOperatorId,
  );
}
