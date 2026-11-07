import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: readonly LegalSection[] = [
  { title: "legal.privacy.s1.title", body: "legal.privacy.s1.body" },
  { title: "legal.privacy.s2.title", body: "legal.privacy.s2.body" },
  { title: "legal.privacy.s3.title", body: "legal.privacy.s3.body" },
  { title: "legal.privacy.s4.title", body: "legal.privacy.s4.body" },
  { title: "legal.privacy.s5.title", body: "legal.privacy.s5.body" },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Oranix" },
      {
        name: "description",
        content: "How Oranix collects, uses and protects personal data, and how to exercise your rights.",
      },
      { property: "og:title", content: "Privacy Policy — Oranix" },
      {
        property: "og:description",
        content: "How Oranix collects, uses and protects personal data, and how to exercise your rights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage titleKey="legal.privacy.title" introKey="legal.privacy.intro" sections={SECTIONS} />;
}
