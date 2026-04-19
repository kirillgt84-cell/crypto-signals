import { Metadata } from "next";
import MacroClient from "./MacroClient";

export const metadata: Metadata = {
  title: "Macro — Crypto Signals",
  description: "BTC correlations with SPX500, Gold, VIX",
};

export default function MacroPage() {
  return <MacroClient />;
}
