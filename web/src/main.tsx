import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root";
import "./index.css";

const DesignLab = lazy(() => import("./design/DesignLab"));
const path = location.pathname;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {path.startsWith("/design") ? <Suspense fallback={null}><DesignLab /></Suspense> : <Root />}
  </StrictMode>,
);
