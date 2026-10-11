import { useEffect, useRef, useState } from "react";

const API_URL = "https://dream-chat-app-1.onrender.com";

async function fetchAttachment(messageId, token) {
  const response = await fetch(`${API_URL}/api/messages/${messageId}/attachment`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || "Could not load this attachment.");
  }
  return response.blob();
}

function formatAudioTime(value) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatFileSize(value) {
  const size = Number(value);
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function MessageAttachment({ attachment, messageId, token }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(attachment));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const isAudio = attachment?.mime_type?.startsWith("audio/");
  const isImage = attachment?.mime_type?.startsWith("image/");
  const isVideo = attachment?.mime_type?.startsWith("video/");
  const isPdf = attachment?.mime_type === "application/pdf";

  useEffect(() => {
    if (!attachment) return undefined;
    const controller = new AbortController();
    const audioElement = audioRef.current;
    let active = true;
    let objectUrl = "";

    setLoading(true);
    setError("");
    setPreviewUrl("");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    fetch(`${API_URL}/api/messages/${messageId}/attachment`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || "Could not load this attachment.");
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError" && active) {
          setError(loadError.message || "Could not load this attachment.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
      audioElement?.pause();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, messageId, token]);

  if (!attachment) return null;

  async function downloadAttachment() {
    setDownloading(true);
    setError("");
    let temporaryUrl = "";
    try {
      let url = previewUrl;
      if (!url) {
        const blob = await fetchAttachment(messageId, token);
        temporaryUrl = URL.createObjectURL(blob);
        url = temporaryUrl;
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (downloadError) {
      setError(downloadError.message || "Could not download this attachment.");
    } finally {
      if (temporaryUrl) window.setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1000);
      setDownloading(false);
    }
  }

  async function toggleAudioPlayback() {
    if (!audioRef.current) return;
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

  return (
    <div className="message-attachment">
      {loading && <span className="message-attachment-status">Loading attachment…</span>}
      {error && <small className="message-attachment-error" role="alert">{error}</small>}

      {previewUrl && isImage && (
        <img className="message-attachment-preview" src={previewUrl} alt={attachment.file_name} />
      )}
      {previewUrl && isVideo && (
        <video className="message-attachment-preview" src={previewUrl} controls preload="metadata">
          Your browser does not support video playback.
        </video>
      )}
      {previewUrl && isPdf && (
        <iframe
          className="message-document-preview"
          src={previewUrl}
          title={`Preview of ${attachment.file_name}`}
        />
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

      <div className="message-attachment-file">
        <span className="message-attachment-icon" aria-hidden="true">
          {isAudio ? "♫" : isImage || isVideo ? "▧" : "▤"}
        </span>
        <span className="message-attachment-details">
          <strong>{attachment.file_name}</strong>
          <small>{formatFileSize(attachment.file_size)}{loading ? " · Loading" : ""}</small>
        </span>
        <button
          type="button"
          className="message-attachment-download-button"
          onClick={downloadAttachment}
          disabled={downloading}
          aria-label={`Download ${attachment.file_name}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
