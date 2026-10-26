"use client";

import { useState } from "react";
import { PresentationHeading } from "./presentation-heading";
import { Check, Minus, RotateCcw, Trash2, Waypoints } from "lucide-react";
import { z } from "zod/v4";
import { principleEvents, principleQuestions, tracingPrinciple, tracingPrincipleProps } from "@/lib/shared/presentation-contract";

type EventKey = typeof principleEvents[number]["key"];
const isSignal = (event: typeof principleEvents[number]) => event.behavior || event.attribution;

/** Trusted principle and verdicts; the AI supplies only the lead and takeaway. */
export function TracingPrincipleCanvas(props: z.infer<typeof tracingPrincipleProps>) {
  const [sorted, setSorted] = useState<EventKey[]>([]);
  const [selected, setSelected] = useState<EventKey | null>(null);
  const event = principleEvents.find(item => item.key === selected);
  const sort = (key: EventKey) => { setSelected(key); setSorted(previous => previous.includes(key) ? previous : [...previous, key]); };
  const traced = principleEvents.filter(item => sorted.includes(item.key) && isSignal(item));
  const dropped = principleEvents.filter(item => sorted.includes(item.key) && !isSignal(item));
  const done = sorted.length === principleEvents.length;
  return <section className="principle" aria-label="Tracing principle">
    <PresentationHeading title="What to trace" punctuation="?" subtitle={<>Less, but <span className="presentation-highlight">meaningful</span></>} />
    <p className="session-summary">{props.lead}</p>

    <blockquote className="principle-quote">
      <span className="principle-mark" aria-hidden="true">“</span>
      <p>{tracingPrinciple}</p>
      <div className="principle-gates" aria-hidden="true">{principleQuestions.map(question => <span key={question.key}>{question.label}</span>)}</div>
    </blockquote>

    <div className="principle-sorter">
      <div className="principle-events" role="group" aria-label="Events to sort">
        <span className="session-block-label">Click an event to test it</span>
        {principleEvents.map(item => <button key={item.key} aria-pressed={selected === item.key} className={sorted.includes(item.key) ? (isSignal(item) ? "is-signal" : "is-noise") : undefined} onClick={() => sort(item.key)}><code>{item.label}</code><small>{item.layer}</small></button>)}
      </div>

      <div className="principle-test" role="status" aria-live="polite">
        {event ? <div key={event.key} className="principle-verdict">
          <strong className="principle-event-name">{event.label}</strong>
          {principleQuestions.map((question, index) => {
            const yes = event[question.key];
            return <div key={question.key} className={`principle-gate ${yes ? "is-yes" : "is-no"}`} style={{ animationDelay: `${index * .18}s` }}>{yes ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}<span>{question.label}</span><b>{yes ? "Yes" : "No"}</b></div>;
          })}
          <div className={`principle-result ${isSignal(event) ? "is-signal" : "is-noise"}`}>{isSignal(event) ? <><Waypoints size={16} aria-hidden="true" />Trace it · signal</> : <><Trash2 size={16} aria-hidden="true" />Don&apos;t trace it · noise</>}</div>
        </div> : <p className="principle-empty">Pick an event: it must pass at least one of the two questions to earn a span.</p>}
      </div>

      <div className="principle-bins">
        <div className="principle-bin bin-signal"><span><Waypoints size={14} aria-hidden="true" />Trace · {traced.length}</span><ul>{traced.map(item => <li key={item.key}>{item.label}</li>)}</ul></div>
        <div className="principle-bin bin-noise"><span><Trash2 size={14} aria-hidden="true" />Don&apos;t trace · {dropped.length}</span><ul>{dropped.map(item => <li key={item.key}>{item.label}</li>)}</ul></div>
        {sorted.length > 0 && <button className="session-proxy-toggle principle-reset" onClick={() => { setSorted([]); setSelected(null); }}><RotateCcw size={13} aria-hidden="true" />Reset</button>}
      </div>
    </div>

    <p className={`session-caption principle-takeaway ${done ? "is-done" : ""}`}><strong>Takeaway.</strong> {props.takeaway}</p>
    <div className="overview-navigation"><span aria-live="polite">{sorted.length} of {principleEvents.length} events sorted</span><span className="architecture-demo-note">Demo events · illustrative</span></div>
  </section>;
}
