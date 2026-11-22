import { useEffect, useState } from "react";
import { PatientPage } from "./components/PatientPage";
import { Admin } from "./components/Admin";

export default function App() {
  const [view, setView] = useState<"patient" | "admin">("patient");

  useEffect(() => {
    const open = () => setView("admin");
    window.addEventListener("refine:open-admin", open);
    return () => window.removeEventListener("refine:open-admin", open);
  }, []);

  if (view === "admin") {
    return <Admin onBack={() => setView("patient")} />;
  }
  return <PatientPage />;
}
