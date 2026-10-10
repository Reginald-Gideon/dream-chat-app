import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";
import "../css/UserAvatarMenu.css";

export default function UserAvatarMenu({ userId, name, src, avatarClassName = "", children }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;

    function positionMenu() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuHeight = 135;
      const showAbove = rect.bottom + 8 + menuHeight > window.innerHeight;
      setMenuPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 188)),
        top: showAbove ? rect.top - 8 : rect.bottom + 8,
        transform: showAbove ? "translateY(-100%)" : "none",
      });
    }

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    document.addEventListener("scroll", positionMenu, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", positionMenu);
      document.removeEventListener("scroll", positionMenu, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (userId == null) return children || <Avatar src={src} name={name} className={avatarClassName} />;

  function goTo(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <span className="user-avatar-action" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-avatar-action-trigger"
        aria-label={`Options for ${name || "user"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) {
            const rect = triggerRef.current.getBoundingClientRect();
            const showAbove = rect.bottom + 8 + 135 > window.innerHeight;
            setMenuPosition({
              left: Math.max(8, Math.min(rect.left, window.innerWidth - 188)),
              top: showAbove ? rect.top - 8 : rect.bottom + 8,
              transform: showAbove ? "translateY(-100%)" : "none",
            });
          }
          setOpen((current) => !current);
        }}
      >
        {children || <Avatar src={src} name={name} className={avatarClassName} />}
      </button>
      {open && menuPosition && createPortal(
        <span
          ref={menuRef}
          className="user-avatar-action-menu"
          role="menu"
          aria-label={`${name || "User"} options`}
          style={menuPosition}
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{name || "User"}</strong>
          <button type="button" role="menuitem" onClick={() => goTo(`/profile/${userId}`)}>
            View profile
          </button>
          <button type="button" role="menuitem" onClick={() => goTo(`/feed?statusUser=${userId}`)}>
            View status
          </button>
        </span>,
        document.body
      )}
    </span>
  );
}
