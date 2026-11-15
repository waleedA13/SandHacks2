"use client";

// The only file that loads the ElevenLabs client. The browser gets a
// short-lived token from /api/voice/token; it never sees the key or agent id.
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useEffect, useRef, useState } from "react";

type Result = { score: number; label: string };

// "confirm" plays a caller to one office; "helper" talks to the patient and
// reads the ranked list from its find_therapists tool.
type Props =
  | {
      mode: "confirm";
      listingId: string;
      name: string;
      insurer: string;
      onDone: (r: Result) => void;
    }
  | { mode: "helper" };

const TEXT = {
  confirm: {
    notice: "Demo call. No real office was contacted.",
    start: "Start demo call",
    stop: "Stop call",
    dropped: "The call dropped. You can start it again.",
    failed: "Could not start the call. Try again in a moment.",
  },
  helper: {
    notice: "Answers come from public web pages. Only the office can confirm.",
    start: "Start talking",
    stop: "End conversation",
    dropped: "The conversation dropped. You can start again.",
    failed: "Could not start. Try again in a moment.",
  },
};

export function VoiceWidget(props: Props) {
  return (
    <ConversationProvider>
      <Conversation {...props} />
    </ConversationProvider>
  );
}

function Conversation(props: Props) {
  const confirm = props.mode === "confirm" ? props : null;
  const text = TEXT[props.mode];
  const [starting, setStarting] = useState(false);
  const [note, setNote] = useState("");
  const [lastLine, setLastLine] = useState("");
  const stopRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  const conversation = useConversation({
    onConnect: () => setStarting(false),
    onDisconnect: () => setStarting(false),
    onError: () => {
      setStarting(false);
      setNote(text.dropped);
    },
    onMessage: ({ role, message }) => {
      if (role === "agent") setLastLine(message);
    },
    // Needs the agent_tool_response_full_payload client event enabled; the
    // tool result is the { score, label } that POST /api/calls/result returns.
    onAgentToolResponse: (r) => {
      if (!confirm || r.tool_name !== "save_call_result") return;
      if (r.is_error) return setNote("The answer could not be saved.");
      if (!("full_tool_result" in r)) return;
      let result: Partial<Result> = {};
      try {
        result = JSON.parse(r.full_tool_result);
      } catch {}
      const { score, label } = result;
      if (typeof score !== "number" || typeof label !== "string")
        return setNote("The answer could not be saved.");
      setNote(`Saved. ${label}.`);
      confirm.onDone({ score, label });
    },
  });

  const { status, isSpeaking } = conversation;
  const busy = starting || status !== "disconnected";

  // Keep keyboard focus on whichever button is usable.
  useEffect(() => {
    const target = busy ? stopRef.current : startRef.current;
    const active = document.activeElement;
    if (active === startRef.current || active === stopRef.current)
      target?.focus();
  }, [busy]);

  async function start() {
    setStarting(true);
    setNote("");
    setLastLine("");
    try {
      const res = await fetch(
        "/api/voice/token",
        confirm
          ? { method: "POST" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agent: "helper" }),
            },
      );
      if (!res.ok) throw new Error();
      const { token } = (await res.json()) as { token: string };
      conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        ...(confirm && {
          dynamicVariables: {
            listing_id: confirm.listingId,
            therapist_name: confirm.name,
            insurer: confirm.insurer,
          },
        }),
      });
    } catch {
      setStarting(false);
      setNote(text.failed);
    }
  }

  const state =
    status === "connected"
      ? isSpeaking
        ? "Assistant speaking"
        : "Listening"
      : busy
        ? "Connecting"
        : "Ready to start";

  return (
    <section
      aria-label={confirm ? `Confirm call for ${confirm.name}` : "Ask out loud"}
      style={box}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>{text.notice}</p>
      <p role="status" aria-live="polite" style={{ margin: 0 }}>
        {note || `${state}.`}
      </p>
      {lastLine && (
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: 700 }}>Assistant: </span>
          {lastLine}
        </p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          ref={startRef}
          type="button"
          onClick={start}
          disabled={busy}
          style={button}
        >
          {text.start}
        </button>
        <button
          ref={stopRef}
          type="button"
          onClick={() => {
            setStarting(false);
            conversation.endSession();
          }}
          disabled={!busy}
          style={button}
        >
          {text.stop}
        </button>
      </div>
    </section>
  );
}

// Styling is left to the page; these keep it usable with large text and touch.
const box = {
  display: "grid",
  gap: 12,
  padding: 16,
  border: "2px solid currentColor",
  borderRadius: 8,
  fontSize: "1.125rem",
  lineHeight: 1.5,
} as const;

const button = {
  minHeight: 48,
  padding: "0 20px",
  fontSize: "inherit",
  cursor: "pointer",
} as const;
