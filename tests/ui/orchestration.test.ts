import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrchestrationLayerCanvas } from "../../components/orchestration-layer";
import { OverviewNavigation } from "../../components/overview-navigation";
import { orchestrationSteps } from "../../lib/shared/presentation-contract";

const copy = { summary: "Orchestrator summary.", strategy: "Strategy caption.", decisions: "Decisions caption.", outcome: "Outcome caption.", boundary: "Boundary caption." };
const render = (topic: number) => renderToStaticMarkup(createElement(OverviewNavigation.Provider, { value: { topic, selectTopic: () => {} } }, createElement(OrchestrationLayerCanvas, copy)));

test("orchestration slide uses the shared heading and the Span crumb", () => {
  const html = render(0);
  assert.ok(html.includes("presentation-google-marks"));
  assert.ok(html.includes("<code>orchestration.flow</code>"));
  assert.ok(html.includes(">Span</span>"));
  assert.ok(html.includes(copy.summary) && html.includes(copy.strategy) && !html.includes(copy.decisions));
});

test("the orchestrator span builds up step by step and ends at the Layer 4 boundary", () => {
  const steps = orchestrationSteps.map((_, topic) => render(topic));
  assert.ok(steps[0].includes("as_type=&quot;agent&quot;") && steps[0].includes("tool_using_agent") && !steps[0].includes("block-decisions"));
  assert.ok(!steps[0].includes("update_current_span") && steps[1].includes("update_current_span"));
  assert.ok(steps[1].includes("compose_gallery") && !steps[1].includes("block-outcome") && !steps[1].includes("is-taken"));
  assert.ok(steps[2].includes("final_path") && steps[2].includes("Business fallback") && steps[2].includes("is-taken"));
  assert.ok(steps[3].includes("LiteLLM Router / Proxy") && steps[3].includes("Rate limits") && !steps[3].includes("session-next"));
  steps.forEach((html, topic) => { assert.ok(html.includes(`Step ${topic + 1} of 4`)); assert.ok(html.includes(copy[orchestrationSteps[topic].key])); });
});
