import { useEffect, useRef, useState } from "react";

export default function AttachmentPicker({ disabled, onSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const containerRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen && !documentPickerOpen) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setDocumentPickerOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setDocumentPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [documentPickerOpen, menuOpen]);

  function selectFile(event) {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    event.target.value = "";
    setMenuOpen(false);
    setDocumentPickerOpen(false);
  }

  return (
    <div className="attachment-picker" ref={containerRef}>
      <button
        type="button"
        className="attachment-picker-trigger"
        aria-label="Add an attachment"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={disabled}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {menuOpen && (
        <div className="attachment-picker-menu" role="menu" aria-label="Add to message">
          <button type="button" role="menuitem" onClick={() => cameraInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h-4L8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></svg>
            Camera
          </button>
          <button type="button" role="menuitem" onClick={() => mediaInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></svg>
            Photo &amp; video library
          </button>
          <button type="button" role="menuitem" onClick={() => audioInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            Audio
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setDocumentPickerOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" /><path d="M13 3v7h7" /></svg>
            Document
          </button>
        </div>
      )}

      {documentPickerOpen && (
        <div className="attachment-picker-backdrop" onMouseDown={() => setDocumentPickerOpen(false)}>
          <section
            className="attachment-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attachment-picker-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="attachment-picker-close"
              aria-label="Close document picker"
              onClick={() => setDocumentPickerOpen(false)}
            >
              ×
            </button>
            <h2 id="attachment-picker-title">Choose document</h2>
            <p>Photos, videos, and documents are supported up to 10 MB.</p>
            <button type="button" onClick={() => documentInputRef.current?.click()}>
              <span>Choose from files</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" /><path d="M13 3v7h7" /></svg>
            </button>
            <button type="button" onClick={() => mediaInputRef.current?.click()}>
              <span>Choose photo or video</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></svg>
            </button>
          </section>
        </div>
      )}

      <input ref={cameraInputRef} className="attachment-picker-input" type="file" accept="image/*" capture="environment" onChange={selectFile} />
      <input ref={mediaInputRef} className="attachment-picker-input" type="file" accept="image/*,video/*" onChange={selectFile} />
      <input ref={audioInputRef} className="attachment-picker-input" type="file" accept="audio/*" onChange={selectFile} />
      <input ref={documentInputRef} className="attachment-picker-input" type="file" onChange={selectFile} />
    </div>
  );
}
