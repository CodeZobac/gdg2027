"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, ChevronDown, Code2, Images, Info, Menu, MessageSquare, Plus, ShieldCheck, Sparkles, Terminal, X } from "lucide-react";
import "@/components/presentation.css";
import { PresentationChat } from "@/components/presentation-chat";
import { ChatResponse } from "@/components/chat-response";
import { PhotoGallery } from "@/components/photo-gallery";
import { chatReplySchema, type ChatReply, type ChatTurn } from "@/lib/shared/chat-contract";

type Message = { id: number; role: "user" | "assistant"; text: string; reply?: ChatReply };

export default function Home() {
  const [tab, setTab] = useState<"chat" | "presentation">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState({ connected: false, reason: "Checking the assistant connection…" });
  const requestController = useRef<AbortController | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [panel, setPanel] = useState<"about" | "photos" | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [history, setHistory] = useState<{ title: string; messages: Message[] }[]>([]);
  const dialog = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => () => { requestController.current?.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function checkConnection() {
      try {
        const response = await fetch("/api/chat", { cache: "no-store", signal: controller.signal });
        const status = await response.json();
        if (!controller.signal.aborted && !requestController.current) setConnection({ connected: response.ok && status.connected === true, reason: status.reason || "The assistant could not be reached." });
      } catch {
        if (!controller.signal.aborted && !requestController.current) setConnection({ connected: false, reason: "The assistant server could not be reached. Check your internet connection and try again." });
      }
    }
    void checkConnection();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (panel !== "about") return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
      if (event.key !== "Tab") return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>("button, input");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previousFocus?.focus(); };
  }, [panel]);

  async function send(text = draft) {
    const value = text.trim();
    if (!value || busy) return;
    setDraft("");
    // Short, text-only context so follow-ups work; the server treats it as untrusted.
    const history: ChatTurn[] = messages.slice(-6).map(message => ({ role: message.role, text: (message.role === "user" ? message.text : message.reply?.text ?? "").slice(0, 800) })).filter(turn => turn.text.trim());
    setMessages(previous => [...previous, { id: Date.now(), role: "user", text: value }]);
    setBusy(true);
    setError("");
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value, history }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The assistant is unavailable.");
      const reply = chatReplySchema.parse(body);
      if (!controller.signal.aborted) { setConnection({ connected: true, reason: "" }); setMessages(previous => [...previous, { id: Date.now(), role: "assistant", text: "", reply }]); }
    } catch (error) {
      if (!controller.signal.aborted) {
        const reason = error instanceof Error ? error.message : "The assistant is unavailable.";
        setError(reason);
        setConnection({ connected: false, reason });
      }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function newChat() {
    setTab("chat");
    requestController.current?.abort();
    setError("");
    if (messages.length) setHistory(previous => [{ title: messages[0].text, messages }, ...previous].slice(0, 8));
    setMessages([]); setDraft(""); setBusy(false); setSidebar(false); input.current?.focus();
  }

  return (
    <div className="app-shell">
      {sidebar && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? "is-open" : ""}`}>
        <Link className="brand" href="/" aria-label="GDG Faro home"><Image src="/brand/gdg-faro.png" alt="GDG Faro" width={400} height={72} priority /></Link>
        <div className="workspace-label">THE COMMUNITY PLAYGROUND</div>
        <button className="new-chat" onClick={newChat}><Plus size={18} /> New conversation <span>↗</span></button>
        <nav aria-label="Main navigation">
          <button className={`nav-item ${tab === "chat" ? "active" : ""}`} onClick={() => { setTab("chat"); setPanel(null); setSidebar(false); }}><MessageSquare size={18} /> Chat {tab === "chat" && <span className="nav-dot" />}</button>
          <button className={`nav-item ${tab === "presentation" ? "active" : ""}`} onClick={() => { setTab("presentation"); setPanel(null); setSidebar(false); }}><Sparkles size={18} /> Presentation {tab === "presentation" && <span className="nav-dot" />}</button>
          <button className={`nav-item ${panel === "photos" ? "active" : ""}`} onClick={() => { setPanel("photos"); setSidebar(false); }}><Images size={18} /> Last year&apos;s gallery </button>
        </nav>
        <div className="history-heading">YOUR CONVERSATIONS <span>{history.length.toString().padStart(2, "0")}</span></div>
        <div className="history-list">
          {history.length ? history.map((chat, index) => <button key={index} className="history-item" onClick={() => { requestController.current?.abort(); setError(""); setBusy(false); setMessages(chat.messages); setTab("chat"); setSidebar(false); }}><MessageSquare size={14} /><span>{chat.title}</span></button>) : <div className="empty-history"><span className="history-line" /><p>A little curiosity goes a long way.</p><span>Your conversations will appear here.</span></div>}
        </div>
        <div className="sidebar-bottom">
          <div className="build-note"><span className="code-icon"><Code2 size={19} /></span><div><strong>Built to explore.</strong><p>A little AI. A lot of possibility.</p></div><ArrowUp size={15} className="diagonal-arrow" /></div>
          <button className="about-button" onClick={() => setPanel("about")}><Info size={17} /> About this app <ArrowRight size={15} /></button>
          <div className="community-profile"><span className="profile-mark">F</span><div><strong>GDG Faro community</strong><span>Learn. Build. Share.</span></div><span className="online-dot" /></div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar"><div className="topbar-title"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebar(true)}><Menu size={21} /></button><span>{tab === "presentation" ? "Presentation" : "Langfuse assistant"}</span><span className="version-tag">EXPERIMENT 01</span></div><div className="topbar-right"><div className="connection-status" role="status"><span className={`agent-status ${connection.connected ? "is-connected" : "is-disconnected"}`}>{connection.connected ? "Connected" : "Disconnected"}</span>{!connection.connected && <span className="connection-reason">{connection.reason}</span>}</div><button className="icon-button" aria-label="About this app" onClick={() => setPanel("about")}><Info size={18} /></button></div></header>
        <PresentationChat active={tab === "presentation"} showSource={showSource} />
        <div className="chat-view" hidden={tab !== "chat"}>
        <main className={`chat-main ${messages.length ? "has-messages" : ""}`}>
          {!messages.length ? <div className="welcome">
            <div className="welcome-eyebrow"><span /> GDG FARO · LANGFUSE TALK</div>
            <div className="assistant-symbol" aria-hidden="true"><Sparkles size={35} strokeWidth={1.5} /><span className="symbol-dot dot-red" /><span className="symbol-dot dot-green" /><span className="symbol-dot dot-yellow" /></div>
            <h1>Your AI, observable.<br /><span>Ask about Langfuse.</span></h1>
            <p className="welcome-description">Traces, spans, generations and the four layers from today&apos;s talk.<br className="desktop-break" /> Ask anything: answers come from the presentation, with a slide when it helps.</p>
            <div className="welcome-note"><ShieldCheck size={14} /> Grounded in the GDG Faro Langfuse presentation.</div>
          </div> : <div className="messages" aria-live="polite" aria-relevant="additions">{messages.map(message => <article className={`message ${message.role}`} key={message.id}>{message.role === "assistant" && <div className="message-avatar"><Sparkles size={18} /></div>}<div className="message-content">{message.role === "assistant" && <div className="message-name">Faro assistant <span>AGENT</span></div>}{message.role === "user" ? <p>{message.text}</p> : message.reply ? <ChatResponse reply={message.reply} showSource={showSource} /> : null}</div></article>)}{busy && <div className="thinking" role="status"><Sparkles size={17} /><span>Thinking it through</span><span className="thinking-dots">···</span></div>}<div ref={end} /></div>}
        </main>
        <div className="composer-area"><div className="composer-inner">{error && <p className="agent-error" role="alert">{error}</p>}
          {messages.length > 0 && <button className="start-over" onClick={newChat}><Plus size={14} /> New conversation</button>}
          <form className="composer" onSubmit={event => { event.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="message">Ask the Langfuse assistant</label>
            <textarea id="message" ref={input} rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} placeholder="Ask about traces, LiteLLM or the four layers…" />
            <div className="composer-tools"><span className="composer-hint"><Sparkles size={15} /> Try “Show me layer 2” or “What should I not trace?”</span><div className="composer-actions"><span className="enter-hint">Enter to send</span><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim() || busy}><ArrowUp size={20} /></button></div></div>
          </form>
          <div className="composer-footer"><span><span className="four-dots"><i /><i /><i /><i /></span> A GDG Faro experiment</span><button className={`source-toggle ${showSource ? "selected" : ""}`} onClick={() => setShowSource(!showSource)} aria-pressed={showSource}><Terminal size={13} /> OpenUI <ChevronDown size={12} /></button></div>
          <p className="demo-disclaimer">Answers grounded in the presentation · DeepSeek Flash via OpenUI · may contain mistakes.</p>
        </div></div>
        </div>
      </div>
      {panel === "photos" && <PhotoGallery onClose={() => setPanel(null)} />}
      {panel === "about" && <div className="modal-backdrop" onClick={() => setPanel(null)}><section ref={dialog} className="info-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") setPanel(null); }}><button autoFocus className="modal-close icon-button" aria-label="Close dialog" onClick={() => setPanel(null)}><X size={21} /></button><span className="modal-icon"><Code2 size={28} /></span><div className="welcome-eyebrow">GDG FARO · LANGFUSE ASSISTANT</div><h2 id="modal-title">Illuminating the black box.</h2><p>A companion to the talk &ldquo;Langfuse: Illuminating the black box in the AI era&rdquo;. The assistant answers from the presentation and can embed any of its interactive slides. Built with Next.js, React, OpenUI and DeepSeek Flash.</p><ul><li><Check size={16} /> Answers grounded in the presentation content</li><li><Check size={16} /> Slides rendered as validated OpenUI components</li><li><ShieldCheck size={16} /> Demo data only · no telemetry is sent to Langfuse</li></ul><button className="modal-primary" onClick={() => { setPanel(null); setTab("chat"); send("Walk me through the four layers"); }}>Ask about the four layers <ArrowRight size={17} /></button></section></div>}
    </div>
  );
}
