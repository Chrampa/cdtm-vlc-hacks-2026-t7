import { useEffect, useState } from "react";
import "./design/design.css";
import { useMatcher } from "./core/useMatcher";
import type { DesignId } from "./core/DesignSwitch";
import PeopleApp from "./designs/people/PeopleApp";
import MapApp from "./designs/map/MapApp";

const fromPath = (): DesignId => (location.pathname.startsWith("/map") ? "map" : "people");

export default function Root() {
  const m = useMatcher();
  const [design, setDesign] = useState<DesignId>(fromPath);

  useEffect(() => {
    if (location.hash === "#results") history.replaceState(null, "", location.pathname);
    const onPop = () => setDesign(fromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    document.title = design === "map" ? "Insider · Coverage Map" : "Insider · People";
  }, [design]);

  const switchTo = (d: DesignId) => {
    if (d === design) return;
    history.pushState(null, "", (d === "map" ? "/map" : "/people") + location.hash);
    setDesign(d);
    window.scrollTo({ top: 0 });
  };

  return design === "map" ? <MapApp m={m} switchTo={switchTo} /> : <PeopleApp m={m} switchTo={switchTo} />;
}
