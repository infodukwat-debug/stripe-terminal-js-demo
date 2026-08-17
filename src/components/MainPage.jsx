import React, { Component } from "react";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      readerStatus: "initializing",
    };
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({ readerStatus: "connected" });
    }, 2000);
  }

  render() {
    if (this.state.readerStatus === "initializing") {
      return (
        <div style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1A1A2E 0%, #2D2E47 100%)",
          color: "white",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "60px", marginBottom: "32px" }}>⏳</div>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "16px", fontWeight: "700" }}>
            Connexion au lecteur...
          </h2>
          <p style={{ fontSize: "1rem", color: "rgba(255, 255, 255, 0.7)" }}>
            Veuillez patienter...
          </p>
          <div style={{ marginTop: "24px", display: "flex", gap: "8px" }}>
            <div style={{
              width: "8px",
              height: "8px",
              background: "#0066FF",
              borderRadius: "50%",
              animation: "pulse 1s infinite"
            }} />
            <div style={{
              width: "8px",
              height: "8px",
              background: "#0066FF",
              borderRadius: "50%",
              animation: "pulse 1s infinite",
              animationDelay: "0.15s"
            }} />
            <div style={{
              width: "8px",
              height: "8px",
              background: "#0066FF",
              borderRadius: "50%",
              animation: "pulse 1s infinite",
              animationDelay: "0.3s"
            }} />
          </div>
        </div>
      );
    }

    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0066FF 0%, #1A1A2E 100%)",
        color: "white",
        textAlign: "center",
        cursor: "pointer",
        padding: "24px",
      }}>
        <div style={{ fontSize: "5rem", marginBottom: "24px" }}>🛋️</div>
        <h1 style={{
          fontSize: "clamp(2.5rem, 8vw, 4rem)",
          margin: "0 0 16px 0",
          fontWeight: "900",
          letterSpacing: "-1px",
        }}>
          Qnook
        </h1>
        <p style={{
          fontSize: "clamp(1.2rem, 4vw, 1.5rem)",
          margin: "0 0 32px 0",
          fontWeight: "400",
          opacity: 0.95,
        }}>
          Bienvenue chez Qnook
        </p>
        <p style={{
          fontSize: "1.1rem",
          margin: "0",
          opacity: 0.85,
          fontWeight: "500",
        }}>
          ➜ Touchez l'écran pour commencer
        </p>
        <div style={{
          position: "absolute",
          bottom: "32px",
          background: "rgba(16, 185, 129, 0.9)",
          padding: "8px 16px",
          borderRadius: "20px",
          fontSize: "0.9rem",
          fontWeight: "600",
        }}>
          ✅ Lecteur connecté
        </div>
      </div>
    );
  }
}

export default App;
