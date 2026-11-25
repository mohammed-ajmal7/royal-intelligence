import type { Metadata } from "next";
import LegacyWorkspace from "../../components/LegacyWorkspace";
import "./legacy.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Advanced Tools",
  description: "CrownPilot advanced Clash Royale deck lab, global-ranked analysis, and card comparisons.",
};

export default function AdvancedPage() {
  return <LegacyWorkspace />;
}
