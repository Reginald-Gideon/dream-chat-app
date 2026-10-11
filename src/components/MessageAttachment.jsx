import { useEffect, useRef, useState } from "react";

const API_URL = "https://dream-chat-app-1.onrender.com";

export default function MessageAttachment({ attachment, messageId, token }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playWhenReady, setPlayWhenReady] = useState(false);
  const audioRef = useRef(null);
  const isAudio = attachment?.mime_type?.startsWith("audio/");
  const isVisual = attachment?.mime_type?.startsWith("image/") || attachment?.mime_type?.startsWith("video/");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => () => audioRef.current?.pause(), []);

  useEffect(() => {
    if (!previewUrl || !isAudio || !playWhenReady || !audioRef.current) return;
    setPlayWhenReady(false);
    audioRef.current.play().catch(() => {
      setError("Audio is ready. Press play to listen.");
    });
  }, [isAudio, playWhenReady, previewUrl]);

  async function openAttachment(download = false) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/messages/${messageId}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.blob();
      if (!response.ok) {
        const message = await data.text();
        throw new Error(message || "Could not load this attachment.");
      }
      const url = URL.createObjectURL(data);
      if (download || (!isVisual && !isAudio)) {
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        setPreviewUrl(url);
        if (isAudio) setPlayWhenReady(true);
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load this attachment.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAudioPlayback() {
    if (!audioRef.current) {
      await openAttachment(false);
      return;
    }
    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setError("");
      } catch {
        setError("Could not play this audio file in your browser.");
      }
    } else {
      audioRef.current.pause();
    }
  }

  if (!attachment) return null;
  const size = Number(attachment.file_size);
  const sizeLabel = size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;

  return (
    <div className="message-attachment">
      {previewUrl && attachment.mime_type.startsWith("image/") && (
        <img className="message-attachment-preview" src={previewUrl} alt={attachment.file_name} />
      )}
      {previewUrl && attachment.mime_type.startsWith("video/") && (
        <video className="message-attachment-preview" src={previewUrl} controls preload="metadata" />
      )}
      {previewUrl && isAudio && (
        <div className="message-audio-player">
          <audio
            ref={audioRef}
            src={previewUrl}
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          >
            Your browser does not support audio playback.
          </audio>
          <button
            type="button"
            className="message-audio-toggle"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            title={isPlaying ? "Pause audio" : "Play audio"}
            onClick={toggleAudioPlayback}
            disabled={loading}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM15 5h3v14h-3z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z" /></svg>
            )}
          </button>
          <input
            className="message-audio-progress"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            aria-label="Audio position"
            onChange={(event) => {
              if (audioRef.current) {
                audioRef.current.currentTime = Number(event.target.value);
                setCurrentTime(audioRef.current.currentTime);
              }
            }}
          />
          <span className="message-audio-time">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </span>
        </div>
      )}
      {!previewUrl && !isAudio && (
        <button
          type="button"
          className="message-attachment-download"
          onClick={() => openAttachment(!isVisual)}
          disabled={loading}
        >
          <span className="message-attachment-icon" aria-hidden="true">↧</span>
          <span className="message-attachment-details">
            <strong>{attachment.file_name}</strong>
            <small>{loading ? "Loading…" : `${sizeLabel} · ${isVisual ? "Open" : "Download"}`}</small>
          </span>
        </button>
      )}
      {!previewUrl && isAudio && (
        <button
          type="button"
          className="message-attachment-download"
          onClick={() => openAttachment(false)}
          disabled={loading}
        >
          <span className="message-attachment-icon" aria-hidden="true">♫</span>
          <span className="message-attachment-details">
            <strong>{attachment.file_name}</strong>
            <small>{loading ? "Loading…" : `${sizeLabel} · Play / pause`}</small>
          </span>
        </button>
      )}
      {previewUrl && isVisual && (
        <button type="button" className="message-attachment-download" onClick={() => openAttachment(true)} disabled={loading}>
          Download original
        </button>
      )}
      {error && <small className="message-attachment-error" role="alert">{error}</small>}
    </div>
  );
}

function formatAudioTime(value) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
