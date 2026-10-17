import type { Metadata } from "next";
import { FeedbackBox } from "@/components/feedback-box";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Hisab stores on your device, and what a shared calculator link contains.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl">Privacy</h1>
      <p className="mt-3">Hisab works without an account. Calculator maths runs in your browser from the numbers on the page.</p>
      <h2 className="mt-8 text-2xl">On this device</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Goals from the plan page, under the key hisab.goals.v1.</li>
        <li>The theme choice, under hisab.theme.</li>
        <li>Feedback you choose to keep, under hisab.feedback.v1.</li>
      </ul>
      <p className="mt-3">Clear goals from the plan page. Clear the rest from the browser site data for this origin. Nothing in that list is sent to a Hisab server in this release.</p>
      <h2 className="mt-8 text-2xl">Shared links</h2>
      <p className="mt-3">A calculator link contains the assumptions that differ from the labelled defaults, plus the methodology version. It should not contain a name, PAN, account number, or employer. Personalised links are marked noindex. The canonical page is the calculator without those inputs.</p>
      <h2 className="mt-8 text-2xl">The calculation API</h2>
      <p className="mt-3">POST /api/calculate repeats a calculator for a future integration. It is rate limited in memory on one server instance. Do not send identity documents to it. The response is the same maths as the page.</p>
      <h2 className="mt-8 text-2xl">Analytics</h2>
      <p className="mt-3">No third-party analytics script is installed. A future measurement tool would need its own review before it is added.</p>
      <FeedbackBox />
    </div>
  );
}
