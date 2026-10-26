import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InferenceLayerCanvas } from "../../components/inference-layer";
import { OverviewNavigation } from "../../components/overview-navigation";
import { inferenceSteps } from "../../lib/shared/presentation-contract";

const copy = { summary: "Inference summary.", automatic: "Automatic caption.", linking: "Linking caption.", capture: "Capture caption.", context: "Context caption." };
const render = (topic: number) => renderToStaticMarkup(createElement(OverviewNavigation.Provider, { value: { topic, selectTopic: () => {} } }, createElement(InferenceLayerCanvas, copy)));

test("inference slide uses the shared heading and starts with one automatic generation", () => {
  const html = render(0);
  assert.ok(html.includes("presentation-google-marks"));
  assert.ok(html.includes("<code>model.inference</code>") && html.includes(">Generation</span>"));
  assert.ok(html.includes("litellm.callbacks = [&quot;langfuse_otel&quot;]") && html.includes("litellm.completion("));
  assert.ok(html.includes("1 Generation from the callback") && !html.includes("duplicate Generation"));
  assert.ok(html.includes("as_type=&quot;generation&quot;"), "anti-pattern toggle is offered");
  assert.ok(!html.includes("@observe(as_type=&quot;generation&quot;)  #"), "anti-pattern code is not shown by default");
  assert.ok(html.includes(copy.summary) && html.includes(copy.automatic) && !html.includes(copy.linking));
});

test("the generation builds up step by step", () => {
  const steps = inferenceSteps.map((_, topic) => render(topic));
  assert.ok(steps[1].includes("inherits the active context") && steps[1].includes("current span") && steps[1].includes("Classic · langfuse") && !steps[1].includes("block-capture"));
  assert.ok(steps[2].includes("model_group") && steps[2].includes("deepseek/deepseek-chat") && steps[2].includes("temperature=0.2") && steps[2].includes("Primary provider fails"));
  assert.ok(steps[3].includes("photo-caption · v3") && steps[3].includes("[EMAIL]") && !steps[3].includes("ana@example.com") && steps[3].includes("prompt.compile"));
  assert.ok(!steps[3].includes("session-next"));
  steps.forEach((html, topic) => { assert.ok(html.includes(`Step ${topic + 1} of 4`)); assert.ok(html.includes(copy[inferenceSteps[topic].key])); });
});
