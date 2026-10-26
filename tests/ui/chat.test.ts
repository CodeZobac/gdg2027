import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatResponse } from "../../components/chat-response";
import { PhotoGallery } from "../../components/photo-gallery";

test("chat answers render text, and embed the trusted slide canvas only when present", () => {
  const textOnly = renderToStaticMarkup(createElement(ChatResponse, { reply: { mode: "chat", source: 'root = Response([part0])\npart0 = Text("Line one.\\nLine two.")', text: "Line one." }, showSource: false }));
  assert.ok(textOnly.includes("<p>Line one.</p><p>Line two.</p>"));
  assert.ok(!textOnly.includes("chat-slide"));
  const withSlide = renderToStaticMarkup(createElement(ChatResponse, { reply: { mode: "chat", source: 'root = Response([part0, part1])\npart0 = Text("Here is layer 1.")\npart1 = SessionLayer("Summary copy.", "Entrypoint copy.", "Identity copy.", "Context copy.", "Cost copy.")', text: "Here is layer 1." }, showSource: true }));
  assert.equal((withSlide.match(/class="chat-slide"/g) ?? []).length, 1);
  assert.ok(withSlide.includes("<code>interaction.session</code>") && withSlide.includes("Entrypoint copy."));
  assert.ok(withSlide.includes("OpenUI Lang · chat answer"));
});

test("last year's gallery opens as a labelled dialog with loading tiles", () => {
  const html = renderToStaticMarkup(createElement(PhotoGallery, { onClose: () => {} }));
  assert.ok(html.includes('role="dialog"') && html.includes("Last year&#x27;s gallery"));
  assert.equal((html.match(/gallery-tile is-skeleton/g) ?? []).length, 12);
  assert.ok(html.includes("photos never reach the AI model"));
});
