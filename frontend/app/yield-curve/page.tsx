import { Metadata } from "next";
import YieldCurveClient from "./YieldCurveClient";

export const metadata: Metadata = {
  title: "Yield Curve — Crypto Signals",
  description: "US Treasury yield curve, recession probability, historical analogs",
};

export default function YieldCurvePage() {
  return <YieldCurveClient />;
}
