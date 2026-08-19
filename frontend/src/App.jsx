import { useEffect, useState } from "react";

const ORDERS_API = import.meta.env.VITE_ORDERS_API_URL || "http://localhost:4000";
const CATALOG_API = import.meta.env.VITE_CATALOG_API_URL || "http://localhost:8080";

function useHealth(url) {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${url}/health`, { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted) {
          setStatus(r.ok ? "healthy" : `unhealthy (${r.status})`);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (!controller.signal.aborted) setStatus("unreachable");
      });
    return () => controller.abort();
  }, [url]);

  return status;
}

export default function App() {
  const ordersStatus = useHealth(ORDERS_API);
  const catalogStatus = useHealth(CATALOG_API);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>Microservices Platform</h1>
      <p>Frontend is up. Backend service health:</p>
      <ul>
        <li>
          <strong>Orders API</strong> (Node/Express): {ordersStatus}
        </li>
        <li>
          <strong>Catalog API</strong> (Spring Boot): {catalogStatus}
        </li>
      </ul>
    </main>
  );
}
