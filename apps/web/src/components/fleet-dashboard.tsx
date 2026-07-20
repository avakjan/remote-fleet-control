"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getVehicles,
  setVehicleOnlineStatus,
  type Vehicle,
} from "@/lib/api";
import styles from "@/app/page.module.css";

type Notice = {
  tone: "success" | "error";
  text: string;
};

export function FleetDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void getVehicles(controller.signal)
      .then((data) => {
        setVehicles(data);
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

  async function refresh() {
    setRefreshing(true);
    setNotice(null);
    setLoadError(null);

    try {
      setVehicles(await getVehicles());
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleStatus(vehicle: Vehicle) {
    const nextStatus = !vehicle.isOnline;
    setPendingVehicleId(vehicle.id);
    setNotice(null);

    try {
      const updated = await setVehicleOnlineStatus(vehicle.id, nextStatus);
      setVehicles((current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)) ?? [
          updated,
        ],
      );
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
      setPendingVehicleId(null);
    }
  }

  if (vehicles === null && loadError) {
    return (
      <section className={styles.statePanel} aria-labelledby="load-error-title">
        <p className={styles.stateLabel}>Connection issue</p>
        <h2 id="load-error-title">The fleet could not be loaded</h2>
        <p>{loadError}</p>
        <button className={styles.primaryButton} type="button" onClick={refresh}>
          Try again
        </button>
      </section>
    );
  }

  if (vehicles === null) {
    return <FleetSkeleton />;
  }

  return (
    <>
      <section className={styles.summary} aria-label="Fleet summary">
        <SummaryItem label="Vehicles" value={totals.all} />
        <SummaryItem label="Online" value={totals.online} />
        <SummaryItem label="Assigned" value={totals.assigned} />
        <button
          className={styles.refreshButton}
          type="button"
          onClick={refresh}
          disabled={refreshing}
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
            {vehicles.map((vehicle) => {
              const pending = pendingVehicleId === vehicle.id;
              return (
                <article className={styles.vehicleRow} key={vehicle.id}>
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
                        {vehicle.assignedOperatorId ? "Assigned" : "Available"}
                      </span>
                    </div>
                  </div>

                  <button
                    className={styles.statusButton}
                    type="button"
                    disabled={pending}
                    onClick={() => toggleStatus(vehicle)}
                    aria-label={`Set ${vehicle.code} ${vehicle.isOnline ? "offline" : "online"}`}
                  >
                    {pending
                      ? "Saving..."
                      : `Set ${vehicle.isOnline ? "offline" : "online"}`}
                  </button>
                </article>
              );
            })}
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
