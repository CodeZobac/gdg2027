import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OperationsLayerCanvas } from "../../components/operations-layer";
import { OverviewNavigation } from "../../components/overview-navigation";
import { operationSteps } from "../../lib/shared/presentation-contract";

const copy = { summary: "Operations summary.", separation: "Separation caption.", type: "Type caption.", io: "IO caption.", quality: "Quality caption." };
const render = (topic: number) => renderToStaticMarkup(createElement(OverviewNavigation.Provider, { value: { topic, selectTopic: () => {} } }, createElement(OperationsLayerCanvas, copy)));

test("operations slide uses the shared heading and shows decide vs execute first", () => {
  const html = render(0);
  assert.ok(html.includes("presentation-google-marks"));
  assert.ok(html.includes("<code>operation.unit</code>") && html.includes(">Span</span>"));
  assert.ok(html.includes("Layer 2 decides · Layer 3 executes") && html.includes("<code>orchestration.flow</code>"));
  assert.ok(html.includes(copy.summary) && html.includes(copy.separation) && !html.includes(copy.type));
  assert.ok(!html.includes("@observe("));
});

test("the operation span builds up step by step", () => {
  const steps = operationSteps.map((_, topic) => render(topic));
  assert.ok(steps[1].includes("@observe(as_type=&quot;tool&quot;)") && steps[1].includes("operation_type") && !steps[1].includes("block-io"));
  assert.ok(!steps[1].includes("capture_input"));
  assert.ok(steps[2].includes("capture_input=False, capture_output=False") && steps[2].includes("Summary only") && !steps[2].includes("token="));
  assert.ok(steps[3].includes("Missing data") && steps[3].includes("Ambiguous units") && steps[3].includes("Inconsistent range") && !steps[3].includes("session-next"));
  steps.forEach((html, topic) => { assert.ok(html.includes(`Step ${topic + 1} of 4`)); assert.ok(html.includes(copy[operationSteps[topic].key])); });
});
