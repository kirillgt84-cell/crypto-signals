import { Metadata } from "next";
import PortfolioClient from "./PortfolioClient";

export const metadata: Metadata = {
  title: "Portfolio — Mirkaso",
  description: "Track your crypto portfolio across exchanges and wallets",
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
