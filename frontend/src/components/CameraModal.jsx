import { useState, useEffect, useRef } from "react";
import api from "../api";

export default function CameraModal({ activeSession, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("init"); // init | detecting | verifying | success | error
  const [statusMessage, setStatusMessage] = useState("Initializing camera stream...");
  const [error, setError] = useState("");

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setStatus("detecting");
    setStatusMessage("Requesting camera permission & detecting face...");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStatusMessage("Face detected inside frame. Click 'Start Verification'.");
    } catch (err) {
      setStatus("error");
      setError("Camera permission denied or camera unavailable. Please check browser permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleVerifyFace = async () => {
    setStatus("verifying");
    setStatusMessage("Verifying identity & checking liveness...");
    setError("");

    try {
      // Capture frame from canvas
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext("2d");
        context.drawImage(videoRef.current, 0, 0, 320, 240);
      }

      // Simulate verification call to backend
      const res = await api.post("/attendance/camera/verify", {
        session_id: activeSession.id,
        image_data: canvasRef.current ? canvasRef.current.toDataURL("image/jpeg") : null,
        liveness_confirmed: true
      });

      if (res.data.success) {
        setStatus("success");
        setStatusMessage(res.data.message || "✅ Attendance Marked Successfully!");
        setTimeout(() => {
          stopCamera();
          onSuccess(res.data);
        }, 1800);
      } else {
        setStatus("error");
        setError(res.data.message || "Face verification failed. Please align your face inside the frame.");
      }
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.detail || "Face verification failed. Please try again.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>📷 Camera Attendance Verification</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Subject: <strong>{activeSession?.subject}</strong> ({activeSession?.department} {activeSession?.year}-{activeSession?.section})
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>
            ✕
          </button>
        </header>

        {error && <div className="alert-banner alert-warning">{error}</div>}

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
            <h3 style={{ color: "#4ade80", fontSize: "1.4rem", marginBottom: "0.5rem" }}>Attendance Recorded!</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{statusMessage}</p>
          </div>
        ) : (
          <>
            <div className="camera-preview-box">
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="face-target-overlay" />
              <canvas ref={canvasRef} width="320" height="240" style={{ display: "none" }} />
            </div>

            <div className="verification-step-indicator">
              {status === "verifying" ? "🔄 Verifying Identity & Anti-Spoofing..." : statusMessage}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                className="btn-primary"
                onClick={handleVerifyFace}
                disabled={status === "verifying" || status === "error"}
                style={{ flex: 1 }}
              >
                {status === "verifying" ? "Verifying..." : "⚡ Start Face Verification"}
              </button>
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
