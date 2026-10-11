import { useEffect, useRef, useState } from "react";

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function getRecordingType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  return [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function VoiceNoteButton({ disabled, onSend, onError }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      if (recorderRef.current.state !== "inactive") recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getRecordingType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const file = new File(chunksRef.current, `voice-note.${extension}`, { type });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        window.clearInterval(timerRef.current);
        setRecording(false);
        setSeconds(0);
        if (file.size > 0) onSend(file);
        else onError("The voice note was empty. Please try recording again.");
      };
      recorder.onerror = () => {
        recorder.onstop = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        window.clearInterval(timerRef.current);
        setRecording(false);
        setSeconds(0);
        onError("Could not record this voice note. Please try again.");
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (recordError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      onError(recordError.message || "Microphone access was denied.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className={`voice-note-control${recording ? " is-recording" : ""}`}>
      {recording && <span className="voice-note-timer" aria-live="off">{formatDuration(seconds)}</span>}
      <button
        type="button"
        className="voice-note-button"
        aria-label={recording ? "Stop and send voice note" : "Record a voice note"}
        title={recording ? "Stop and send voice note" : "Record a voice note"}
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
          </svg>
        )}
      </button>
    </div>
  );
}
