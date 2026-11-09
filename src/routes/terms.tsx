import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: readonly LegalSection[] = [
  { title: "legal.terms.s1.title", body: "legal.terms.s1.body" },
  { title: "legal.terms.s2.title", body: "legal.terms.s2.body" },
  { title: "legal.terms.s3.title", body: "legal.terms.s3.body" },
  { title: "legal.terms.s4.title", body: "legal.terms.s4.body" },
  { title: "legal.terms.s5.title", body: "legal.terms.s5.body" },
  { title: "legal.terms.s6.title", body: "legal.terms.s6.body" },
  { title: "legal.terms.s7.title", body: "legal.terms.s7.body" },
];

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Oranix" },
      {
        name: "description",
        content: "The terms that govern the use of Oranix, orders, payments, merchant responsibilities and refunds.",
      },
      { property: "og:title", content: "Terms of Service — Oranix" },
      {
        property: "og:description",
        content: "The terms that govern the use of Oranix, orders, payments, merchant responsibilities and refunds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage titleKey="legal.terms.title" introKey="legal.terms.intro" sections={SECTIONS} />;
}
