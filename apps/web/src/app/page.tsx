import { FleetDashboard } from "@/components/fleet-dashboard";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="#main-content">
            <span className={styles.brandMark} aria-hidden="true">
              RF
            </span>
            <span>
              Remote Fleet
              <small>Control center</small>
            </span>
          </a>
          <p className={styles.systemStatus}>Fleet operations</p>
        </div>
      </header>

      <main className={styles.main} id="main-content">
        <div className={styles.intro}>
          <p className={styles.kicker}>Fleet overview</p>
          <h1>Vehicle control</h1>
          <p>
            Monitor vehicle availability, update connectivity, and select an
            operator to take over or release vehicles.
          </p>
        </div>
        <FleetDashboard />
      </main>
    </div>
  );
}
