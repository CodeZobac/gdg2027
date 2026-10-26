import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionLayerCanvas } from "../../components/session-layer";
import { OverviewNavigation } from "../../components/overview-navigation";
import { sessionSteps } from "../../lib/shared/presentation-contract";

const copy = { summary: "Root trace summary.", entrypoint: "Entrypoint caption.", identity: "Identity caption.", context: "Context caption.", cost: "Cost caption." };
const render = (topic: number) => renderToStaticMarkup(createElement(OverviewNavigation.Provider, { value: { topic, selectTopic: () => {} } }, createElement(SessionLayerCanvas, copy)));

test("session slide uses the shared heading and shows only the active caption", () => {
  const html = render(0);
  assert.ok(html.includes("presentation-google-marks"));
  assert.ok(html.includes("interaction session"));
  assert.ok(html.includes(copy.summary));
  assert.ok(html.includes(copy.entrypoint));
  assert.ok(!html.includes(copy.identity));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
});

test("the root trace builds up progressively, one step at a time", () => {
  const steps = sessionSteps.map((_, topic) => render(topic));
  assert.ok(steps[0].includes("@observe()") && !steps[0].includes("update_current_trace") && !steps[0].includes("block-identity"));
  assert.ok(steps[1].includes("update_current_trace") && steps[1].includes("u_8f2c") && !steps[1].includes("block-context"));
  assert.ok(steps[2].includes("legal_entity") && steps[2].includes("GDG Faro") && !steps[2].includes("block-cost"));
  assert.ok(steps[3].includes("Cost rollup · automatic") && steps[3].includes("$0.0126") && steps[3].includes("LiteLLM Proxy virtual key"));
  assert.ok(!steps[3].includes("session-next"));
  steps.forEach((html, topic) => { assert.ok(html.includes(`Step ${topic + 1} of 4`)); assert.ok(html.includes(copy[sessionSteps[topic].key])); });
});
