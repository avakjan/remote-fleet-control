"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getOperators,
  getVehicles,
  releaseVehicle,
  setVehicleOnlineStatus,
  takeoverVehicle,
  type Operator,
  type Vehicle,
} from "@/lib/api";
import { OperatorPicker } from "./operator-picker";
import { VehicleRow } from "./vehicle-row";
import styles from "./fleet-dashboard.module.css";

type Notice = {
  tone: "success" | "error";
  text: string;
};

type PendingAction = {
  vehicleId: string;
  kind: "status" | "takeover" | "release";
};

export function FleetDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [operators, setOperators] = useState<Operator[] | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      getVehicles(controller.signal),
      getOperators(controller.signal),
    ])
      .then(([vehicleData, operatorData]) => {
        setVehicles(vehicleData);
        setOperators(operatorData);
        setSelectedOperatorId(
          (current) => current || operatorData[0]?.id || "",
        );
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(errorMessage(error));
      });

    return () => controller.abort();
  }, []);

  const totals = useMemo(() => {
    const fleet = vehicles ?? [];
    return {
      all: fleet.length,
      online: fleet.filter((vehicle) => vehicle.isOnline).length,
      assigned: fleet.filter((vehicle) => vehicle.assignedOperatorId).length,
    };
  }, [vehicles]);

  const selectedOperator = operators?.find(
    (operator) => operator.id === selectedOperatorId,
  );
  const selectedAssignment = vehicles?.find(
    (vehicle) => vehicle.assignedOperatorId === selectedOperatorId,
  );

  async function refresh() {
    if (pendingAction) {
      return;
    }

    setRefreshing(true);
    setNotice(null);
    setLoadError(null);

    try {
      const [vehicleData, operatorData] = await Promise.all([
        getVehicles(),
        getOperators(),
      ]);
      setVehicles(vehicleData);
      setOperators(operatorData);
      setSelectedOperatorId((current) =>
        operatorData.some((operator) => operator.id === current)
          ? current
          : operatorData[0]?.id || "",
      );
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleStatus(vehicle: Vehicle) {
    const nextStatus = !vehicle.isOnline;
    setPendingAction({ vehicleId: vehicle.id, kind: "status" });
    setNotice(null);

    try {
      const updated = await setVehicleOnlineStatus(vehicle.id, nextStatus);
      replaceVehicle(updated);
      setNotice({
        tone: "success",
        text: `${vehicle.code} is now ${nextStatus ? "online" : "offline"}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "The vehicle status could not be changed.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function changeAssignment(vehicle: Vehicle) {
    if (!selectedOperator) {
      setNotice({
        tone: "error",
        text: "Select an operator before changing an assignment.",
      });
      return;
    }

    const releasing = vehicle.assignedOperatorId === selectedOperator.id;
    setPendingAction({
      vehicleId: vehicle.id,
      kind: releasing ? "release" : "takeover",
    });
    setNotice(null);

    try {
      const updated = releasing
        ? await releaseVehicle(vehicle.id, selectedOperator.id)
        : await takeoverVehicle(vehicle.id, selectedOperator.id);
      replaceVehicle(updated);
      setNotice({
        tone: "success",
        text: releasing
          ? `${selectedOperator.name} released ${vehicle.code}.`
          : `${selectedOperator.name} took over ${vehicle.code}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "The assignment could not be changed.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  function replaceVehicle(updated: Vehicle) {
    setVehicles(
      (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)) ?? [
          updated,
        ],
    );
  }

  if ((vehicles === null || operators === null) && loadError) {
    return (
      <section className={styles.statePanel} aria-labelledby="load-error-title">
        <p className={styles.stateLabel}>Connection issue</p>
        <h2 id="load-error-title">The fleet could not be loaded</h2>
        <p>{loadError}</p>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={refresh}
        >
          Try again
        </button>
      </section>
    );
  }

  if (vehicles === null || operators === null) {
    return <FleetSkeleton />;
  }

  return (
    <>
      <OperatorPicker
        operators={operators}
        vehicles={vehicles}
        selectedOperatorId={selectedOperatorId}
        selectedAssignment={selectedAssignment}
        disabled={pendingAction !== null}
        onChange={(operatorId) => {
          setSelectedOperatorId(operatorId);
          setNotice(null);
        }}
      />

      <section className={styles.summary} aria-label="Fleet summary">
        <SummaryItem label="Vehicles" value={totals.all} />
        <SummaryItem label="Online" value={totals.online} />
        <SummaryItem label="Assigned" value={totals.assigned} />
        <button
          className={styles.refreshButton}
          type="button"
          onClick={refresh}
          disabled={refreshing || pendingAction !== null}
        >
          {refreshing ? "Refreshing..." : "Refresh fleet"}
        </button>
      </section>

      {notice ? (
        <div
          className={styles.notice}
          data-tone={notice.tone}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      ) : null}

      {loadError ? (
        <div className={styles.notice} data-tone="error" role="alert">
          Refresh failed: {loadError}
        </div>
      ) : null}

      {vehicles.length === 0 ? (
        <section className={styles.statePanel} aria-labelledby="empty-title">
          <p className={styles.stateLabel}>No vehicles</p>
          <h2 id="empty-title">The fleet is empty</h2>
          <p>Add a vehicle through the API, then refresh this screen.</p>
        </section>
      ) : (
        <section className={styles.fleetSection} aria-labelledby="fleet-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="fleet-title">Vehicles</h2>
              <p>Connectivity and assignment are shown independently.</p>
            </div>
            <p className={styles.updatedNote} aria-live="polite">
              {refreshing ? "Updating fleet data" : "Fleet data is current"}
            </p>
          </div>

          <div className={styles.vehicleList}>
            {vehicles.map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                operators={operators}
                selectedOperatorId={selectedOperatorId}
                selectedAssignmentId={selectedAssignment?.id ?? null}
                hasSelectedOperator={Boolean(selectedOperator)}
                pendingKind={
                  pendingAction?.vehicleId === vehicle.id
                    ? pendingAction.kind
                    : undefined
                }
                anyPending={pendingAction !== null}
                onToggleStatus={toggleStatus}
                onChangeAssignment={changeAssignment}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FleetSkeleton() {
  return (
    <section className={styles.loadingState} aria-label="Loading fleet">
      <div className={styles.skeletonSummary} />
      <div className={styles.skeletonHeading} />
      {[0, 1, 2, 3].map((item) => (
        <div className={styles.skeletonRow} key={item} />
      ))}
      <span className={styles.srOnly}>Loading fleet vehicles</span>
    </section>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not load the fleet";
}
