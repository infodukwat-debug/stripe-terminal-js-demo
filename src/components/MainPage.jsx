import React, { Component } from "react";
import Client from "../client";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      readerStatus: "initializing",
      showProductSelection: false,
      showEmailForm: false,
      selectedProduct: null,
      products: [],
      wantReceipt: false,
      customerEmail: "",
      wantReminder: false,
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
    this.setState({ 
      selectedProduct: product,
      showEmailForm: true,
      showProductSelection: false,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: "",
    });
  };

  handleEmailFormCancel = () => {
    this.setState({
      showProductSelection: true,
      showEmailForm: false,
      selectedProduct: null
    });
  };

  handleEmailChange = (e) => {
    this.setState({ customerEmail: e.target.value });
  };

  handleWantReceiptChange = (e) => {
    this.setState({ wantReceipt: e.target.checked });
  };

  handleWantReminderChange = (e) => {
    this.setState({ wantReminder: e.target.checked });
  };

  handleEmailFormSubmit = () => {
    const { wantReceipt, wantReminder, customerEmail, selectedProduct } = this.state;
    
    // Validation
    if ((wantReceipt || wantReminder) && !customerEmail) {
      alert("Veuillez saisir une adresse email.");
      return;
    }

    // Démarrer la session
    console.log("Session démarrée pour:", selectedProduct);
    console.log("Email:", customerEmail);
    console.log("Reçu:", wantReceipt);
    console.log("Rappel:", wantReminder);
    
    // TODO: Traiter le paiement
  };

  render() {
    const { readerStatus, showProductSelection, showEmailForm, selectedProduct, products, wantReceipt, wantReminder, customerEmail } = this.state;

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

    // Écran de formulaire email
    if (showEmailForm && selectedProduct) {
      const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
      
      return (
        <div style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #F5F5F7 0%, #FFFFFF 100%)",
          padding: "24px",
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
          }}>
            <h2 style={{ marginBottom: "24px", color: "#1A1A2E", fontSize: "1.5rem", fontWeight: "700" }}>
              ⚙️ Options de la session
            </h2>

            <p style={{
              marginBottom: "24px",
              color: "#6B7280",
              fontSize: "0.95rem",
            }}>
              Vous avez choisi : <strong>{selectedProduct.name}</strong>
              <br />
              <strong style={{ color: "#0066FF", fontSize: "1.1rem" }}>
                {(selectedProduct.price / 100).toFixed(2)} EUR
              </strong>
            </p>

            <div style={{
              background: "#F0F4FF",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "24px",
              fontSize: "0.9rem",
              color: "#0066FF",
            }}>
              <strong>ℹ️ Comment ça fonctionne</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                <li>Pré-autorisation (×2) – aucun débit immédiat</li>
                <li>Temps supplémentaire : <strong>0,50 €/min</strong></li>
                <li>Vous ne payez que le temps réel</li>
              </ul>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}>
                <input 
                  type="checkbox" 
                  checked={wantReceipt}
                  onChange={this.handleWantReceiptChange}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ color: "#1A1A2E" }}>Recevoir le reçu par email</span>
              </label>
            </div>

            {chosenMinutes > 5 && (
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}>
                  <input 
                    type="checkbox" 
                    checked={wantReminder}
                    onChange={this.handleWantReminderChange}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ color: "#1A1A2E" }}>Recevoir un rappel 5 min avant la fin</span>
                </label>
              </div>
            )}

            {(wantReceipt || wantReminder) && (
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#1A1A2E",
                  fontSize: "0.95rem",
                }}>
                  📧 Email :
                </label>
                <input 
                  type="email" 
                  value={customerEmail}
                  onChange={this.handleEmailChange}
                  placeholder="votre.email@example.com"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            )}

            <div style={{
              display: "flex",
              gap: "12px",
              marginTop: "32px",
              flexWrap: "wrap",
            }}>
              <button 
                onClick={this.handleEmailFormSubmit}
                style={{
                  flex: 1,
                  minWidth: "140px",
                  padding: "16px",
                  backgroundColor: "#0066FF",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0052CC";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0066FF";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                🚀 Démarrer la session
              </button>
              <button 
                onClick={this.handleEmailFormCancel}
                style={{
                  flex: 1,
                  minWidth: "140px",
                  padding: "16px",
                  backgroundColor: "#E5E7EB",
                  color: "#1A1A2E",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#D1D5DB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#E5E7EB";
                }}
              >
                ❌ Annuler
              </button>
            </div>
          </div>
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
