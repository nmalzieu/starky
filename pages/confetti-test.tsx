import { useState, useEffect } from "react";
import ReactConfetti from "react-confetti";

const ConfettiTest = () => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimension, setWindowDimension] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  useEffect(() => {
    setWindowDimension({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "40px",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1>Confetti Animation Test</h1>

      <div style={{ marginTop: "40px" }}>
        <button
          onClick={() => setShowConfetti(true)}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          Show Confetti
        </button>

        <button
          onClick={() => setShowConfetti(false)}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Hide Confetti
        </button>
      </div>

      {showConfetti && typeof window !== "undefined" && (
        <>
          <ReactConfetti
            width={windowDimension.width}
            height={windowDimension.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />
          <div
            style={{
              marginTop: "40px",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
            }}
          >
            <h2>YOU'RE ALL SET FREN</h2>
            <p>Identity verification successful!</p>
          </div>
        </>
      )}

      <div style={{ marginTop: "40px" }}>
        <h3>Test Information</h3>
        <ul style={{ textAlign: "left", lineHeight: "1.6" }}>
          <li>Click "Show Confetti" to simulate a successful verification</li>
          <li>
            The confetti should appear and fall from the top of the screen
          </li>
          <li>
            The animation should stop after a few seconds (not loop infinitely)
          </li>
          <li>Click "Hide Confetti" to clear the animation</li>
        </ul>
      </div>
    </div>
  );
};

export default ConfettiTest;
