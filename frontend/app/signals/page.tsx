import SignalsClient from "./SignalsClient";

export const metadata = {
  title: "Signals — Fast Lane",
  description: "Volume Spike / OI Anomaly Scanner",
};

export default function SignalsPage() {
  return <SignalsClient />;
}
