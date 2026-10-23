import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangfuseOverviewCanvas } from "../../components/langfuse-overview";
import { OverviewNavigation } from "../../components/overview-navigation";
import { overviewCategories } from "../../lib/shared/presentation-contract";

test("trusted overview renders required teaching points, Demo data, and initial accordion state", async () => {
  const html = renderToStaticMarkup(createElement(LangfuseOverviewCanvas, {
    observability: "Follow each request through your application.",
    promptManagement: "Ship better prompts with confidence.",
    evaluation: "Compare before you deploy.",
    analytics: "Spot regressions early.",
  }));
  assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 3);
  assert.equal((html.match(/class="langfuse-topic-panel"[^>]*hidden=""/g) ?? []).length, 3);
  for (const category of overviewCategories) {
    const section = html.split(`category-${category.key} `)[1]?.split("</section>")[0];
    assert.ok(section, category.key);
    for (const term of category.terms) assert.ok(section.includes(`<strong>${term}</strong>`), term);
    assert.ok(section.includes("Demo data"));
  }
  assert.ok(html.includes("No Langfuse connection or actual app telemetry."));
  assert.ok(!html.includes("Next topic"));
  assert.ok(html.includes("Code check:"));
  assert.ok(html.includes("Chart metric"));
});

test("presentation-owned topic selection expands exactly the requested card", () => {
  for (let topic = 0; topic < 4; topic++) {
    const html = renderToStaticMarkup(createElement(OverviewNavigation.Provider, { value: { topic, selectTopic: () => {} } }, createElement(LangfuseOverviewCanvas, {
      observability: "Trace the request.", promptManagement: "Ship better prompts.", evaluation: "Compare before deploying.", analytics: "Catch regressions early.",
    })));
    assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1);
    const card = html.split(`category-${overviewCategories[topic].key} `)[1]?.split("</section>")[0];
    assert.ok(card?.includes('aria-expanded="true"'));
    assert.ok(!html.includes("Next topic"));
  }
});
