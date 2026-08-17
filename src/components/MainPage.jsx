import React, { Component } from "react";
import Client from "../client";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      readerStatus: "initializing",
      showProductSelection: false,
      products: [],
    };
  }

  componentDidMount() {
    // Initialize client
    this.client = new Client('https://qnook-backend-unified.onrender.com');
    
    // Simulate reader connection
    setTimeout(() => {
      this.setState({ readerStatus: "connected" });
    }, 2000);
    
    // Load products
    this.loadProducts();
  }

  loadProducts = async () => {
    try {
      const response = await fetch('https://qnook-backend-unified.onrender.com/api/products');
      if (response.ok) {
        const data = await response.json();
        this.setState({ products: data });
      }
    } catch (err) {
      console.error("Erreur chargement produits:", err);
    }
  };

  handleWelcomeClick = () => {
    this.setState({ showProductSelection: true });
  };

  handleProductSelect = (product) => {
    console.log("Produit sélectionné:", product);
    alert(`Vous avez choisi: ${product.name} - ${(product.price / 100).toFixed(2)} EUR`);
  };

  render() {
    const { readerStatus, showProductSelection, products } = this.state;

    // Écran de chargement
    if (readerStatus === "initializing") {
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
        </div>
      );
    }

    // Écran de sélection des produits
    if (showProductSelection) {
      return (
        <div style={{
          width: "100vw",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #F5F5F7 0%, #FFFFFF 100%)",
          padding: "40px 20px",
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <h2 style={{
                fontSize: "2.5rem",
                margin: "0 0 12px 0",
                color: "#1A1A2E",
                fontWeight: "900",
              }}>
                Choisissez votre durée
              </h2>
              <p style={{
                color: "#6B7280",
                fontSize: "1.1rem",
                margin: "0",
              }}>
                Touchez la durée qui vous convient
              </p>
            </div>

            {/* Grid de produits */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "28px",
              marginTop: "40px",
            }}>
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => this.handleProductSelect(product)}
                  style={{
                    background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFF 100%)",
                    border: "2px solid #E5E7EB",
                    borderRadius: "16px",
                    padding: "28px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-12px) scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 16px 40px rgba(0, 102, 255, 0.2)";
                    e.currentTarget.style.borderColor = "#0066FF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                    e.currentTarget.style.borderColor = "#E5E7EB";
                  }}
                >
                  <div style={{
                    fontSize: "3.5rem",
                    marginBottom: "16px",
                    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                  }}>
                    {product.image || "🛋️"}
                  </div>

                  <h3 style={{
                    fontSize: "1.4rem",
                    color: "#1A1A2E",
                    margin: "0 0 12px 0",
                    fontWeight: "700",
                  }}>
                    {product.name}
                  </h3>

                  <div style={{
                    color: "#0066FF",
                    fontSize: "1.5rem",
                    fontWeight: "800",
                  }}>
                    {(product.price / 100).toFixed(2)} EUR
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Écran d'accueil
    return (
      <div 
        onClick={this.handleWelcomeClick}
        style={{
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
          position: "relative",
        }}
      >
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
