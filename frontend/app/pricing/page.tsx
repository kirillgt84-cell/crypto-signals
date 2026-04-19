import { Suspense } from "react";
import PricingClient from "./PricingClient";

export const metadata = {
  title: "Pricing — Fast Lane",
  description: "Upgrade to Pro for premium signals and analytics",
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19]" />}>
      <PricingClient />
    </Suspense>
  );
}
