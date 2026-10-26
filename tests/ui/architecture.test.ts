import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArchitectureLayersCanvas } from "../../components/architecture-layers";
import { OverviewNavigation } from "../../components/overview-navigation";
import { architectureLayers, architectureInstrumenters } from "../../lib/shared/presentation-contract";

const copy = {
  summary: "Still an AI execution tree; only the instrumentation changes per layer.",
  session: "Session copy.", orchestration: "Orchestrator copy.", operation: "Operations copy.", inference: "Inference copy.",
};
const render = (topic?: number) => renderToStaticMarkup(topic === undefined
  ? createElement(ArchitectureLayersCanvas, copy)
  : createElement(OverviewNavigation.Provider, { value: { topic, selectTopic: () => {} } }, createElement(ArchitectureLayersCanvas, copy)));

test("trusted architecture renders every layer fact, instrumenter and the shared heading", () => {
  const html = render();
  assert.ok(html.includes("presentation-google-marks"));
  assert.ok(html.includes("AI execution tree"));
  assert.ok(html.includes(copy.summary));
  for (const layer of architectureLayers) {
    const block = html.split(`layer-${layer.key} `)[1]?.split("</li>")[0];
    assert.ok(block, layer.key);
    assert.ok(block.includes(`<code>${layer.name}</code>`));
    assert.ok(block.includes(`>${layer.type}</span>`));
    assert.ok(block.includes(copy[layer.key]));
  }
  for (const item of architectureInstrumenters) assert.ok(html.includes(`<strong>${item.name}</strong>`));
  assert.ok(html.includes("@observe()"));
  assert.ok(html.includes("as_type=&quot;retriever&quot;"));
  assert.ok(html.includes("Demo data"));
});

test("default Langfuse lens lights layers 1–3 and dims the LiteLLM layer", () => {
  const html = render();
  for (const layer of architectureLayers) {
    const classes = html.split(`execution-layer layer-${layer.key} `)[1]?.split('"')[0] ?? "";
    assert.ok(classes.includes(layer.instrumentedBy === "langfuse" ? "is-lit" : "is-dimmed"), layer.key);
  }
});

test("presentation-owned layer selection expands exactly the requested layer", () => {
  for (let topic = 0; topic < 4; topic++) {
    const html = render(topic);
    assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1);
    assert.equal((html.match(/class="execution-layer-panel"[^>]*hidden=""/g) ?? []).length, 3);
    assert.ok(html.split(`layer-${architectureLayers[topic].key} `)[1]?.split("</li>")[0]?.includes('aria-expanded="true"'));
    assert.ok(html.includes(`Layer ${topic + 1} of 4`));
  }
});
