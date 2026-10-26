import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QRCode from "qrcode";
import { ClosingLinksCanvas } from "../../components/closing-links";
import { TracingPrincipleCanvas } from "../../components/tracing-principle";
import { closingLinks, principleEvents, principleQuestions, tracingPrinciple } from "../../lib/shared/presentation-contract";

test("principle slide renders the trusted statement verbatim with both questions and every event", () => {
  const html = renderToStaticMarkup(createElement(TracingPrincipleCanvas, { lead: "Lead copy.", takeaway: "Takeaway copy." }));
  assert.ok(html.includes("presentation-google-marks"));
  assert.ok(html.includes(tracingPrinciple.replaceAll("'", "&#x27;")));
  for (const question of principleQuestions) assert.ok(html.includes(question.label));
  for (const event of principleEvents) assert.ok(html.includes(event.label), event.key);
  assert.ok(html.includes("0 of 6 events sorted") && html.includes("Lead copy.") && html.includes("Takeaway copy."));
});

test("closing slide draws one QR per trusted link, with matching module count and real links", () => {
  const html = renderToStaticMarkup(createElement(ClosingLinksCanvas, { thanks: "Thanks copy.", profile: "Profile copy.", repository: "Repo copy." }));
  assert.ok(html.includes("Thank you"));
  const svgs = html.match(/<svg class="qr-svg"[\s\S]*?<\/svg>/g) ?? [];
  assert.equal(svgs.length, 2);
  closingLinks.forEach((link, index) => {
    const size = QRCode.create(link.url, { errorCorrectionLevel: "M" }).modules.size;
    assert.ok(svgs[index].includes(`viewBox="0 0 ${size + 8} ${size + 8}"`), link.key);
    assert.ok(html.includes(`href="${link.url}"`) && html.includes(link.handle));
  });
  assert.ok(html.includes('rel="noopener noreferrer"') && html.includes("Enlarge to scan") && html.includes("Copy link"));
});
