import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Avatar from "./Avatar";
import "../css/Call.css";

const API = "https://dream-chat-app-1.onrender.com";

// ICE servers help two browsers find a network path to each other.
// STUN (free, from Google) tells each browser its own public address.
// TURN (optional) relays video when a direct path is impossible (strict networks).
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
if (process.env.REACT_APP_TURN_URL) {
  ICE_SERVERS.push({
    urls: process.env.REACT_APP_TURN_URL,
    username: process.env.REACT_APP_TURN_USERNAME,
    credential: process.env.REACT_APP_TURN_CREDENTIAL,
  });
}

// Turn a number of seconds into "02:35" (or "1:02:35" for calls over an hour).
function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/*
  CallOverlay lives inside Layout, so it is mounted on EVERY page.
  That is what lets an incoming call ring no matter where you are in the app.

  status is one of:
    "idle"       nothing happening (renders nothing)
    "calling"    I pressed the call button and I'm waiting for them to pick up
    "incoming"   someone is calling me
    "connecting" accepted, video connection is being set up
    "connected"  video is flowing
*/
export default function CallOverlay() {
  const token = localStorage.getItem("token");

  const [status, setStatus] = useState("idle");
  const [peer, setPeer] = useState(null); // { id, username, avatar }
  const [notice, setNotice] = useState(""); // short message like "No answer."
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [minimized, setMinimized] = useState(false); // true = small bar at the top
  const [elapsed, setElapsed] = useState(0); // seconds since the call connected
  const [pipPos, setPipPos] = useState(null); // where the floating window was dragged to
  const pipRef = useRef(null); // the floating window element
  const dragRef = useRef(null); // info about a drag in progress

  // Refs hold values that must not trigger a re-render and must never be "stale"
  // inside socket listeners (which are created once).
  const socketRef = useRef(null);
  const pcRef = useRef(null); // the RTCPeerConnection (the actual video link)
  const localStreamRef = useRef(null); // my camera + mic
  const remoteStreamRef = useRef(null); // their camera + mic
  const pendingCandidates = useRef([]); // network hints that arrived too early
  const peerRef = useRef(null); // peer's user id
  const statusRef = useRef("idle");
  const ringTimer = useRef(null);
  const actions = useRef({}); // always points at the newest functions (see bottom)

  function updateStatus(next) {
    statusRef.current = next;
    setStatus(next);
  }

  // Put everything back to normal: stop camera, close the connection, hide the screen.
  function cleanup(message = "") {
    clearTimeout(ringTimer.current);
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      // Stopping the tracks is what turns the camera light off.
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingCandidates.current = [];
    peerRef.current = null;
    setPeer(null);
    setMicOn(true);
    setCamOn(true);
    setMinimized(false);
    setPipPos(null);
    updateStatus("idle");
    if (message) {
      setNotice(message);
      setTimeout(() => setNotice(""), 3500);
    }
  }

  // Ask the browser for the camera + microphone (it shows a permission popup).
  async function getLocalMedia() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      // These ask the browser to remove echo (your speaker sound coming back
      // into your mic), background noise, and uneven volume.
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStreamRef.current = stream;
    return stream;
  }

  // Create the video link and wire up its events.
  function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Send my camera + mic to the other person.
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // The browser discovers possible network paths ("ICE candidates").
    // Each one is passed to the other person through the server.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call:signal", {
          toUserId: peerId,
          data: { candidate: event.candidate.toJSON() },
        });
      }
    };

    // Their video + audio arrived.
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      const el = document.getElementById("call-remote-video");
      if (el) el.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") updateStatus("connected");
      if (pc.connectionState === "failed") {
        socketRef.current?.emit("call:end", { toUserId: peerId });
        cleanup("The connection failed. Try again, or try a different network.");
      }
    };

    pcRef.current = pc;
    return pc;
  }

  // ---------- things I do ----------

  async function startCall(target) {
    if (statusRef.current !== "idle" || !target?.id) return;
    peerRef.current = target.id;
    setPeer(target);
    updateStatus("calling");

    try {
      await getLocalMedia();
    } catch {
      cleanup("Couldn't use your camera or microphone. Check your browser permissions.");
      return;
    }

    socketRef.current.emit("call:invite", { toUserId: target.id });

    // Give up after 30 seconds of ringing.
    ringTimer.current = setTimeout(() => {
      socketRef.current?.emit("call:end", { toUserId: target.id });
      cleanup("No answer.");
    }, 30000);
  }

  async function acceptCall() {
    const callerId = peerRef.current;
    try {
      await getLocalMedia();
    } catch {
      socketRef.current.emit("call:reject", { toUserId: callerId });
      cleanup("Couldn't use your camera or microphone. Check your browser permissions.");
      return;
    }
    updateStatus("connecting");
    createPeerConnection(callerId); // ready and waiting for the caller's offer
    socketRef.current.emit("call:accept", { toUserId: callerId });
  }

  function declineCall() {
    socketRef.current?.emit("call:reject", { toUserId: peerRef.current });
    cleanup();
  }

  function hangUp() {
    socketRef.current?.emit("call:end", { toUserId: peerRef.current });
    cleanup();
  }

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled; // disabled = sends silence, but the connection stays up
    setMicOn(track.enabled);
  }

  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled; // disabled = sends black frames
    setCamOn(track.enabled);
  }

  // ---------- things the server tells me ----------

  function onIncoming({ fromUserId, fromUsername, fromAvatar }) {
    if (statusRef.current !== "idle") return;
    peerRef.current = fromUserId;
    setPeer({ id: fromUserId, username: fromUsername, avatar: fromAvatar });
    updateStatus("incoming");
  }

  // They picked up. I'm the caller, so I make the first move: the "offer".
  async function onAccepted({ fromUserId }) {
    if (statusRef.current !== "calling" || fromUserId !== peerRef.current) return;
    clearTimeout(ringTimer.current);
    updateStatus("connecting");
    try {
      const pc = createPeerConnection(fromUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("call:signal", {
        toUserId: fromUserId,
        data: { sdp: { type: offer.type, sdp: offer.sdp } },
      });
    } catch (err) {
      console.error("Offer error:", err);
      hangUp();
    }
  }

  // Offer / answer / network hints from the other person.
  async function onSignal({ fromUserId, data }) {
    const pc = pcRef.current;
    if (!pc || fromUserId !== peerRef.current) return;
    try {
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        // Apply any network hints that arrived before the description did.
        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidates.current = [];

        if (data.sdp.type === "offer") {
          // I'm the callee: answer their offer.
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit("call:signal", {
            toUserId: fromUserId,
            data: { sdp: { type: answer.type, sdp: answer.sdp } },
          });
        }
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
        else pendingCandidates.current.push(data.candidate);
      }
    } catch (err) {
      console.error("Signal error:", err);
    }
  }

  function onRejected() {
    cleanup(`${peer?.username || "They"} declined the call.`);
  }

  function onEnded({ fromUserId }) {
    if (fromUserId !== peerRef.current) return;
    if (statusRef.current === "incoming") cleanup(`Missed call from ${peer?.username || "someone"}.`);
    else cleanup("Call ended.");
  }

  function onUnavailable({ reason }) {
    cleanup(reason === "offline" ? `${peer?.username || "They"} is offline.` : "You can only call friends.");
  }

  function onBusy() {
    cleanup(`${peer?.username || "They"} is already on a call.`);
  }

  function onHandledElsewhere() {
    // I picked up (or declined) in another tab, so stop ringing here.
    if (statusRef.current === "incoming") cleanup();
  }

  // The socket listeners below are registered ONCE, but they need the newest
  // versions of the functions above. Re-pointing this ref on every render
  // solves that: listeners always call actions.current.something().
  actions.current = {
    startCall, onIncoming, onAccepted, onSignal, onRejected,
    onEnded, onUnavailable, onBusy, onHandledElsewhere, cleanup,
  };

  // Call timer: starts counting the moment the video connects.
  useEffect(() => {
    if (status !== "connected") {
      setElapsed(0);
      return undefined;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API, { auth: { token } });
    socketRef.current = socket;

    socket.on("call:incoming", (d) => actions.current.onIncoming(d));
    socket.on("call:accepted", (d) => actions.current.onAccepted(d));
    socket.on("call:signal", (d) => actions.current.onSignal(d));
    socket.on("call:rejected", (d) => actions.current.onRejected(d));
    socket.on("call:ended", (d) => actions.current.onEnded(d));
    socket.on("call:unavailable", (d) => actions.current.onUnavailable(d));
    socket.on("call:busy", () => actions.current.onBusy());
    socket.on("call:handledElsewhere", () => actions.current.onHandledElsewhere());

    // ChatPage's call button announces itself with a browser event,
    // so ChatPage doesn't need to know anything about how calls work.
    function handleStartCall(event) {
      actions.current.startCall(event.detail);
    }
    window.addEventListener("start-call", handleStartCall);

    // The "Return to call" button in the chat asks us to leave minimized mode.
    function handleExpand() {
      setMinimized(false);
    }
    window.addEventListener("expand-call", handleExpand);

    return () => {
      window.removeEventListener("start-call", handleStartCall);
      window.removeEventListener("expand-call", handleExpand);
      actions.current.cleanup();
      socket.disconnect();
    };
  }, [token]);

  // ---------- floating window: drag it, or tap it to go back to full size ----------

  function onPipPointerDown(e) {
    if (e.target.closest("button")) return; // the mic / end buttons do their own thing
    const rect = pipRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    // Capture keeps sending us pointer events even if the finger/mouse leaves the window.
    pipRef.current.setPointerCapture(e.pointerId);
  }

  function onPipPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // tiny wiggles still count as a tap
    d.moved = true;
    const rect = pipRef.current.getBoundingClientRect();
    // keep the window fully on screen
    const x = Math.min(Math.max(8, d.originX + dx), window.innerWidth - rect.width - 8);
    const y = Math.min(Math.max(8, d.originY + dy), window.innerHeight - rect.height - 8);
    setPipPos({ x, y });
  }

  function onPipPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) setMinimized(false); // a tap (no dragging) = back to full size
  }

  // ---------- what's on screen ----------

  if (status === "idle") {
    return notice ? <div className="call-toast">{notice}</div> : null;
  }

  if (status === "incoming") {
    return (
      <div className="call-backdrop">
        <div className="call-incoming" role="alertdialog" aria-label="Incoming video call">
          <Avatar src={peer?.avatar} name={peer?.username} className="call-incoming-avatar" />
          <h2>{peer?.username}</h2>
          <p>Incoming video call…</p>
          <div className="call-incoming-buttons">
            <button type="button" className="call-btn call-btn-decline" onClick={declineCall}>
              Decline
            </button>
            <button type="button" className="call-btn call-btn-accept" onClick={acceptCall}>
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pipRef}
      className={`call-screen${minimized ? " call-minimized" : ""}`}
      style={minimized && pipPos ? { left: pipPos.x, top: pipPos.y, right: "auto", bottom: "auto" } : undefined}
      onPointerDown={minimized ? onPipPointerDown : undefined}
      onPointerMove={minimized ? onPipPointerMove : undefined}
      onPointerUp={minimized ? onPipPointerUp : undefined}
      onPointerCancel={minimized ? () => { dragRef.current = null; } : undefined}
      onKeyDown={minimized ? (e) => { if (e.key === "Enter") setMinimized(false); } : undefined}
      role={minimized ? "button" : undefined}
      tabIndex={minimized ? 0 : undefined}
      aria-label={minimized ? "Return to the call" : undefined}
    >
      <video
        id="call-remote-video"
        className="call-remote"
        autoPlay
        playsInline
        ref={(el) => {
          if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
            el.srcObject = remoteStreamRef.current;
          }
        }}
      />

      {status !== "connected" && (
        <div className="call-waiting">
          <Avatar src={peer?.avatar} name={peer?.username} className="call-incoming-avatar" />
          <h2>{peer?.username}</h2>
          <p>{status === "calling" ? "Calling…" : "Connecting…"}</p>
        </div>
      )}

      <video
        className={`call-local${camOn ? "" : " call-local-off"}`}
        autoPlay
        playsInline
        muted
        ref={(el) => {
          if (!el) return;
          // Set the DOM property directly. It guarantees you never hear your own voice
          // played back from your own preview.
          el.muted = true;
          if (localStreamRef.current && el.srcObject !== localStreamRef.current) {
            el.srcObject = localStreamRef.current;
          }
        }}
      />

      {/* Top strip: minimize button, and the name + timer once connected */}
      <div className="call-topbar">
        <button
          type="button"
          className="call-minimize"
          onClick={() => setMinimized(true)}
          aria-label="Minimize call"
          title="Minimize"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {status === "connected" && (
          <div className="call-topinfo">
            <strong>{peer?.username}</strong>
            <span className="call-timer">{formatDuration(elapsed)}</span>
          </div>
        )}
      </div>

      <div className="call-controls">
        <button
          type="button"
          className={`call-btn call-btn-round${micOn ? "" : " call-btn-off"}`}
          onClick={toggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          {micOn ? "Mic on" : "Mic off"}
        </button>
        <button
          type="button"
          className={`call-btn call-btn-round${camOn ? "" : " call-btn-off"}`}
          onClick={toggleCam}
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        >
          {camOn ? "Cam on" : "Cam off"}
        </button>
        <button type="button" className="call-btn call-btn-decline" onClick={hangUp}>
          {status === "calling" ? "Cancel" : "End call"}
        </button>
      </div>

      {/* Minimized = floating window. Name + time on top, mic + end at the bottom.
          Drag the window to move it. Tap it anywhere else to go back to full size. */}
      {minimized && (
        <>
          <div className="pip-info">
            <strong>{peer?.username}</strong>
            <span>
              {status === "connected"
                ? formatDuration(elapsed)
                : status === "calling" ? "Calling…" : "Connecting…"}
            </span>
          </div>

          <div className="pip-actions">
            <button
              type="button"
              className={`pip-btn${micOn ? "" : " pip-btn-off"}`}
              onClick={toggleMic}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                {!micOn && <line x1="3" y1="3" x2="21" y2="21" />}
              </svg>
            </button>
            <button type="button" className="pip-btn pip-btn-end" onClick={hangUp} aria-label="End call">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}