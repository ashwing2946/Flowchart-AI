import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ArrowUp, Check, ChevronDown, ExternalLink, LoaderCircle, Moon, RotateCcw, Sun, Upload } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

const THINKING_STEPS = ["Understanding your question...", "Analyzing project context...", "Thinking about the architecture..."];
const PROGRESS_STEPS = ["Reading the flowchart", "Project context ready", "Ready for questions"];
const SUGGESTIONS = [
  { title: "Summarize", prompt: "Summarize the architecture of this project." },
  { title: "Trace the flow", prompt: "Trace the main data flow from start to finish." },
  { title: "Key components", prompt: "List the key components and what each one does." },
];

// ---------- Presentational helpers (UI only) ----------

// Cursor tracking for the glass effects: writes CSS variables directly (no React re-render)
const glow = {
  "data-glow": "",
  onPointerMove: (e) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--tx", `${(x / r.width - 0.5) * 4}px`);
    el.style.setProperty("--ty", `${(y / r.height - 0.5) * 3}px`);
  },
  onPointerLeave: (e) => {
    e.currentTarget.style.setProperty("--tx", "0px");
    e.currentTarget.style.setProperty("--ty", "0px");
  },
};

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={onToggle} {...glow}
      className="liquid relative h-8 w-16 shrink-0 rounded-full"
    >
      <span className={`absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-accent text-bg shadow-md transition-transform duration-500 ease-out-soft ${dark ? "translate-x-8" : "translate-x-0"}`}>
        <Moon aria-hidden="true" className={`absolute size-3.5 transition-all duration-500 ease-out-soft ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
        <Sun aria-hidden="true" className={`absolute size-3.5 transition-all duration-500 ease-out-soft ${dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      </span>
    </button>
  );
}

function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % THINKING_STEPS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" className="anim-msg-agent glass-soft flex items-center gap-3 self-start rounded-2xl px-4 py-3 text-sm text-muted">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((n) => (
          <span key={n} className="anim-dot size-1.5 rounded-full bg-accent" style={{ animationDelay: `${n * 160}ms` }} />
        ))}
      </span>
      <span key={i} className="anim-rise">{THINKING_STEPS[i]}</span>
    </div>
  );
}

function Progress({ uploading, ready }) {
  return (
    <ol aria-label="Analysis progress" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {PROGRESS_STEPS.map((label, n) => {
        const active = uploading && n === 0;
        const delay = ready ? `${n * 180}ms` : "0ms";
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={`grid size-4 place-items-center rounded-full border transition-colors duration-300 ${ready ? "border-ok bg-ok" : active ? "border-transparent" : "border-fg/25"}`}
              style={{ transitionDelay: delay }}
            >
              {active && <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden="true" />}
              <Check aria-hidden="true" className={`size-3 text-bg transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: delay }} />
            </span>
            <span className={`transition-colors duration-300 ${ready || active ? "text-ink" : "text-muted"}`} style={{ transitionDelay: delay }}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ModuleCard({ m }) {
  const [all, setAll] = useState(false);
  const comps = Array.isArray(m.components) ? m.components : [];
  const shown = all ? comps : comps.slice(0, 5);
  return (
    <article className="rounded-xl border border-line bg-fg/5 p-4">
      <h3 className="m-0 text-sm font-semibold">{m.name}</h3>
      {m.role && <p className="mt-1 text-sm leading-relaxed text-muted">{m.role}</p>}
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
        {shown.map((c, i) => <li key={`${c}-${i}`} className="rounded-md bg-fg/10 px-2 py-1 text-xs text-ink">{c}</li>)}
      </ul>
      {comps.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-accent hover:underline">
          {all ? "Show less" : `Show all ${comps.length}`}
        </button>
      )}
    </article>
  );
}

function Architecture({ data, sessionId }) {
  const mods = Array.isArray(data?.major_modules) ? data.major_modules : [];
  const deps = Array.isArray(data?.external_dependencies) ? data.external_dependencies : [];
  return (
    <div className="mt-3 flex flex-col gap-5 rounded-xl border border-line bg-fg/[0.03] p-4">
      {(data?.architecture_type || data?.project_purpose) && (
        <div>
          {data.architecture_type && <p className="m-0 text-xs font-medium uppercase tracking-wide text-accent">{data.architecture_type}</p>}
          {data.project_purpose && <p className="mt-1 text-sm leading-relaxed text-ink">{data.project_purpose}</p>}
        </div>
      )}
      {mods.length > 0 && <div className="grid gap-3 md:grid-cols-2">{mods.map((m, i) => <ModuleCard key={`${m.name}-${i}`} m={m} />)}</div>}
      {typeof data?.data_flow === "string" && (
        <div>
          <h3 className="m-0 text-sm font-semibold">Data flow</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{data.data_flow}</p>
        </div>
      )}
      {deps.length > 0 && (
        <div>
          <h3 className="m-0 text-sm font-semibold">External dependencies</h3>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
            {deps.map((d, i) => <li key={`${d}-${i}`} className="rounded-md border border-line px-2 py-1 text-xs text-ink">{d}</li>)}
          </ul>
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted">Raw extracted JSON</summary>
        <p className="mt-3 text-xs text-muted">Session ID: <span className="break-all font-mono">{sessionId}</span></p>
        <pre tabIndex={0} aria-label="Extracted architecture JSON" className="m-0 mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function deriveTitle(projectData, file) {
  if (projectData && typeof projectData === "object") {
    for (const k of ["project_name", "project_title", "title", "name"]) {
      if (typeof projectData[k] === "string" && projectData[k].trim()) return projectData[k];
    }
  }
  return file?.name ?? "Flowchart analysis";
}

// ---------- App ----------

export default function FlowchartApp() {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [projectData, setProjectData] = useState(null);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  // Toggle for the extracted architecture panel
  const [showInfo, setShowInfo] = useState(false);

  // Light / dark theme (UI only); index.html applies the saved theme before first paint
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* storage unavailable */ }
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const messagesRef = useRef(null);

  // Clean up the image preview URL when component unmounts or file changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Keep the newest message in view
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory, isChatting]);

  // When the architecture panel opens, bring it into view once it has started expanding
  useEffect(() => {
    if (!showInfo) return;
    const t = setTimeout(() => {
      document.getElementById("architecture-panel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 200);
    return () => clearTimeout(t);
  }, [showInfo]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file first.");

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSessionId(response.data.session_id);
      setProjectData(response.data.project_data);

      setChatHistory([
        {
          role: "assistant",
          content: "I've analyzed your project. What would you like to know or improve?",
          thought: ""
        }
      ]);

    } catch (error) {
      console.error("Upload failed:", error);
      alert(error.response?.data?.detail || "Upload failed. Check the backend logs.");
    } finally {
      setIsUploading(false);
    }
  };

  // Same request/response handling as before, now callable with any text (used by the suggestion cards)
  const sendMessage = async (text) => {
    const newMessage = { role: "user", content: text };
    setChatHistory((prev) => [...prev, newMessage]);
    setChatInput("");
    setIsChatting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        session_id: sessionId,
        message: newMessage.content
      });

      // Mutate the frontend state if the AI updated the architecture
      if (response.data.current_architecture) {
        setProjectData(response.data.current_architecture);
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.reply,
          thought: response.data.thought_process
        }
      ]);

    } catch (error) {
      console.error("Chat failed:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !sessionId) return;
    sendMessage(chatInput);
  };

  const startOver = () => {
    setSessionId(null);
    setFile(null);
    setImagePreview(null);
    setShowInfo(false);
    setChatHistory([]);
  };

  const sendDisabled = !sessionId || isChatting || !chatInput.trim();
  const projectTitle = deriveTitle(projectData, file);

  // ----- Landing: no session yet -----
  if (!sessionId) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-16">
        <div className="orb" aria-hidden="true" />
        <div className="absolute right-5 top-5 z-20"><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
        <div className="anim-rise relative z-10 w-full max-w-2xl">
          <p className="text-sm font-medium text-muted">Flowchart AI Agent</p>
          <h1 className="mt-2 text-4xl font-light leading-tight tracking-tight sm:text-5xl">
            Upload a flowchart.<br /><span className="text-muted">Ask it anything.</span>
          </h1>

          <form onSubmit={handleUpload} {...glow} className="liquid mt-10 flex flex-col gap-4 rounded-3xl p-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-fg/20 px-4 py-5 transition-colors duration-200 hover:border-accent hover:bg-fg/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
              <Upload className="size-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block break-all text-sm font-medium">{file ? file.name : "Choose a flowchart or architecture image"}</span>
                <span className="block text-xs text-muted">PNG, JPG or WebP</span>
              </span>
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="sr-only" />
            </label>

            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="anim-settle max-h-56 w-full rounded-lg bg-white object-contain" />
            )}

            <button
              type="submit"
              disabled={isUploading}
              {...glow} className="liquid liquid-btn flex items-center justify-center rounded-2xl px-6 py-3.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Analyzing Diagram..." : "Upload & Analyze"}
            </button>
          </form>

          <div className="mt-6 min-h-6">{isUploading && <div className="anim-rise"><Progress uploading ready={false} /></div>}</div>
        </div>
      </main>
    );
  }

  // ----- Workspace: flowchart + agent -----
  return (
    <div className="anim-panel ambient flex min-h-dvh flex-col lg:h-dvh lg:flex-row">

      {/* LEFT: project / flowchart understanding */}
      <section aria-label="Project" className="liquid scroll-soft m-3 flex flex-col gap-6 rounded-3xl px-5 py-6 sm:px-8 lg:m-4 lg:mr-2 lg:min-w-0 lg:w-[calc(50%-24px)] lg:flex-none lg:overflow-y-auto">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">Flowchart AI Agent</p>
              <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">{projectTitle}</h1>
              <p className="anim-rise mt-2 flex items-center gap-1.5 text-sm font-medium text-ok">
                <Check className="size-4" aria-hidden="true" /> Project memorized
              </p>
            </div>
            <button
              type="button"
              onClick={startOver}
              {...glow} className="liquid group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            >
              <RotateCcw className="size-4 transition-transform duration-200 ease-out-soft group-hover:-rotate-45" aria-hidden="true" />
              Start Over / Upload New
            </button>
          </div>
          <Progress uploading={isUploading} ready />
        </header>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="min-w-0 truncate text-muted">{file?.name}</span>
            <a href={imagePreview} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1.5 font-medium text-accent hover:underline">
              Open full size <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          {/* Bright sheet: keeps dense diagrams legible on the dark UI */}
          <figure className="anim-settle m-0 rounded-xl bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-shadow duration-300 ease-out-soft hover:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]">
            <img src={imagePreview} alt="Uploaded Architecture" className="block h-auto w-full rounded" />
          </figure>

          <section aria-label="Project context" className="border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              aria-expanded={showInfo}
              aria-controls="architecture-panel"
              title="Toggle Session Info"
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 hover:bg-fg/5"
            >
              <span className="font-medium">Project context (Live State)</span>
              <span className="flex items-center gap-1.5 text-sm text-accent">
                {showInfo ? "Hide extracted architecture" : "View extracted architecture"}
                <ChevronDown className={`size-4 transition-transform duration-300 ease-out-soft ${showInfo ? "rotate-180" : ""}`} aria-hidden="true" />
              </span>
            </button>
            <div id="architecture-panel" className="expander" data-open={showInfo} inert={!showInfo}>
              <div><Architecture data={projectData} sessionId={sessionId} /></div>
            </div>
          </section>
        </div>
      </section>

      {/* RIGHT: conversational agent */}
      <section aria-label="Agent chat" className="liquid m-3 flex h-[85dvh] min-h-0 flex-col rounded-3xl lg:m-4 lg:ml-2 lg:h-auto lg:min-w-0 lg:w-[calc(50%-24px)] lg:flex-none">
        <div className="flex items-center justify-between border-b border-line px-5 py-3 sm:px-6">
          <h2 className="m-0 text-sm font-semibold">Agent</h2>
          <div className="flex items-center gap-3"><span className="text-sm text-muted">Ready for questions</span><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
        </div>

        <div ref={messagesRef} role="log" aria-live="polite" className="scroll-soft flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-6">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] break-words rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                msg.role === "user"
                  ? "anim-msg-user self-end border border-accent/30 bg-accent/15"
                  : "anim-msg-agent glass-soft self-start"
              }`}
            >
              {msg.thought && (
                <details className="mb-3 rounded-lg border border-line bg-fg/5 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted outline-none">View Agent Reasoning</summary>
                  <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{msg.thought}</div>
                </details>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}

          {chatHistory.length === 1 && !isChatting && (
            <div className="anim-rise mt-2 grid gap-3 sm:grid-cols-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => sendMessage(s.prompt)}
                  {...glow} className="liquid rounded-xl p-3 text-left transition-[border-color,translate] duration-150 ease-out-soft hover:-translate-y-px hover:border-accent/50 active:translate-y-0"
                >
                  <span className="block text-sm font-medium text-accent">{s.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{s.prompt}</span>
                </button>
              ))}
            </div>
          )}
          {isChatting && <Thinking />}
        </div>

        <form onSubmit={handleChatSubmit} className="p-4 sm:px-6">
          <div {...glow} className="liquid flex items-center gap-2 rounded-2xl p-2 transition-[border-color,box-shadow] duration-200 ease-out-soft focus-within:border-accent/70 focus-within:shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.15)]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatting}
              aria-label="Message the agent"
              placeholder="Ask anything regarding the flowchart..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={sendDisabled}
              aria-label="Send"
              {...glow} className="liquid liquid-btn grid size-10 place-items-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
