import { useEffect } from "react";
import "./design/design.css";
import { useMatcher } from "./core/useMatcher";
import PeopleApp from "./designs/people/PeopleApp";

export default function Root() {
  const m = useMatcher();

  useEffect(() => {
    if (location.hash === "#results") history.replaceState(null, "", location.pathname);
    document.title = "Talentic · AI Talent Matcher";
  }, []);

  return <PeopleApp m={m} />;
}
