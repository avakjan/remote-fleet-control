import { describe, expect, it } from "vitest";
import {
  getAssignmentActionState,
  getStatusActionState,
} from "./fleet-actions";
import type { Vehicle } from "./api";

const onlineVehicle: Vehicle = {
  id: "vehicle-1",
  code: "FLEET-101",
  name: "Atlas 101",
  isOnline: true,
  assignedOperatorId: null,
  createdAt: "2026-07-20T12:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
};

describe("getAssignmentActionState", () => {
  it("allows takeover for an online unassigned vehicle", () => {
    expect(
      getAssignmentActionState({
        vehicle: onlineVehicle,
        selectedOperatorId: "op-1",
        selectedAssignmentId: null,
        hasSelectedOperator: true,
        pending: false,
      }),
    ).toEqual({
      action: "takeover",
      label: "Take over",
      disabled: false,
    });
  });

  it("allows release when the selected operator owns the vehicle", () => {
    expect(
      getAssignmentActionState({
        vehicle: { ...onlineVehicle, assignedOperatorId: "op-1" },
        selectedOperatorId: "op-1",
        selectedAssignmentId: "vehicle-1",
        hasSelectedOperator: true,
        pending: false,
      }),
    ).toEqual({
      action: "release",
      label: "Release",
      disabled: false,
    });
  });

  it("blocks takeover when the vehicle is offline", () => {
    expect(
      getAssignmentActionState({
        vehicle: { ...onlineVehicle, isOnline: false },
        selectedOperatorId: "op-1",
        selectedAssignmentId: null,
        hasSelectedOperator: true,
        pending: false,
      }),
    ).toMatchObject({
      action: "takeover",
      label: "Offline",
      disabled: true,
      reason: "Only online vehicles can be taken over.",
    });
  });

  it("blocks takeover when the operator already holds another vehicle", () => {
    expect(
      getAssignmentActionState({
        vehicle: onlineVehicle,
        selectedOperatorId: "op-1",
        selectedAssignmentId: "vehicle-2",
        hasSelectedOperator: true,
        pending: false,
      }),
    ).toMatchObject({
      label: "Operator busy",
      disabled: true,
    });
  });

  it("blocks release when another operator owns the vehicle", () => {
    expect(
      getAssignmentActionState({
        vehicle: { ...onlineVehicle, assignedOperatorId: "op-2" },
        selectedOperatorId: "op-1",
        selectedAssignmentId: null,
        hasSelectedOperator: true,
        pending: false,
      }),
    ).toMatchObject({
      label: "In use",
      disabled: true,
    });
  });
});

describe("getStatusActionState", () => {
  it("allows taking an unassigned vehicle offline", () => {
    expect(
      getStatusActionState({
        vehicle: onlineVehicle,
        pending: false,
        anyPending: false,
      }),
    ).toEqual({
      label: "Set offline",
      disabled: false,
      nextOnline: false,
    });
  });

  it("blocks taking an assigned vehicle offline", () => {
    expect(
      getStatusActionState({
        vehicle: { ...onlineVehicle, assignedOperatorId: "op-1" },
        pending: false,
        anyPending: false,
      }),
    ).toMatchObject({
      label: "Set offline",
      disabled: true,
      reason: "Release the vehicle before taking it offline.",
    });
  });

  it("allows bringing an offline vehicle online", () => {
    expect(
      getStatusActionState({
        vehicle: { ...onlineVehicle, isOnline: false },
        pending: false,
        anyPending: false,
      }),
    ).toEqual({
      label: "Set online",
      disabled: false,
      nextOnline: true,
    });
  });
});
