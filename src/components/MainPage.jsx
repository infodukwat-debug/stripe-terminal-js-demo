import React, { Component } from "react";
import { css } from "@emotion/react";

import Client from "../client";
import Logger from "../logger";

import { WelcomeScreen } from "./WelcomeScreen";
import { LoadingScreen } from "./LoadingScreen";
import { ErrorScreen } from "./ErrorScreen";
import { ProductGrid } from "./ProductGrid";
import { SessionScreen } from "./SessionScreen";

const DEFAULT_BACKEND_URL = 'https://qnook-backend-unified.onrender.com';
const EXTRA_MINUTE_PRICE = 50;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "requires_initializing",
      backendURL: DEFAULT_BACKEND_URL,
      discoveredReaders: [],
      connectionStatus: "not_connected",
      reader: null,
      readerLabel: "",
      registrationCode: "",
      cancelablePayment: false,
      chargeAmount: 100,
      itemDescription: "Test produit",
      taxAmount: 0,
      currency: "eur",
      workFlowInProgress: null,
      discoveryWasCancelled: false,
      refundedChargeID: null,
      refundedAmount: null,
      cancelableRefund: false,
      usingSimulator: false,
      testCardNumber: "4242424242424242",
      testPaymentMethod: "visa",
      tipAmount: null,
      simulateOnReaderTip: false,
      selectedProduct: null,
      showProductSelection: false,
      showWelcomeScreen: true,
      sessionStartTime: null,
      sessionActive: false,
      paymentInProgress: false,
      showEmailForm: false,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: "",
      emailSubmitted: false,
      reminderSent: false,
      products: [],
      selectedTestCard: { name: "Visa (succès)", number: "4242424242424242", type: "visa" },
      pendingPaymentIntentId: null,
      currentAuthorizedAmount: 0,
      pricePerMinute: 0,
      showKeyboard: false,
      showInactivityModal: false,
      inactivityTimer1: null,
      inactivityTimer2: null,
      sessionPolling: null,
      readerStatus: "initializing",
      readerError: null,
    };
  }

  componentDidMount() {
    this.initializeBackendClientAndTerminal(DEFAULT_BACKEND_URL);
    this.loadProducts();
    
    setTimeout(() => {
      this.autoConnectSimulator();
    }, 2000);
    
    this.resetInactivityTimers();

    this.sessionPolling = setInterval(() => {
      if (!this.state.sessionActive) return;
      if (this.state.paymentInProgress) return;
      
      fetch('http://localhost:5000/is-session-active')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!data.active) {
            this.endSession();
          }
        })
        .catch(err => console.error("[Polling] Erreur:", err));
    }, 2000);
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.state.inactivityTimer) clearTimeout(this.state.inactivityTimer);
    if (this.sessionPolling) clearInterval(this.sessionPolling);
  }

  resetInactivityTimers = () => {
    if (this.state.sessionActive || this.state.paymentInProgress) return;
    this.clearInactivityTimers();
  };

  clearInactivityTimers = () => {
    if (this.state.inactivityTimer1) clearTimeout(this.state.inactivityTimer1);
    if (this.state.inactivityTimer2) clearTimeout(this.state.inactivityTimer2);
    this.setState({ showInactivityModal: false, inactivityTimer1: null, inactivityTimer2: null });
  };

  quitToWelcome = () => {
    this.clearInactivityTimers();
    this.setState({
      showProductSelection: false,
      showWelcomeScreen: true,
      showEmailForm: false,
      selectedProduct: null,
      customerEmail: "",
      wantReceipt: false,
      wantReminder: false,
      emailSubmitted: false,
      showKeyboard: false,
    });
  };

  handleUserInteraction = () => {
    if (!this.state.sessionActive && !this.state.paymentInProgress && !this.state.showInactivityModal) {
      this.resetInactivityTimers();
    }
  };

  loadProducts = async () => {
    const { backendURL } = this.state;
    if (!backendURL) return;
    try {
      const response = await fetch(`${backendURL}/api/products`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.setState({ products: data });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn("Chargement des produits annulé");
        return;
      }
      console.error("Erreur chargement produits:", err);
    }
  };

  autoConnectSimulator = async () => {
    console.log("Tentative de connexion au simulateur...");
    
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!this.terminal && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    
    if (!this.terminal) {
      console.error("Terminal non initialisé");
      this.setState({ 
        readerStatus: "error",
        readerError: "Terminal Stripe non initialisé" 
      });
      return;
    }

    try {
      const simulatedResult = await this.terminal.discoverReaders({ simulated: true });
      
      if (!simulatedResult) {
        throw new Error("Pas de réponse de discoverReaders");
      }

      if (simulatedResult.error) {
        throw new Error(simulatedResult.error.message || "Erreur découverte");
      }

      if (!simulatedResult.discoveredReaders || simulatedResult.discoveredReaders.length === 0) {
        throw new Error("Aucun simulateur trouvé");
      }

      const connectResult = await this.connectToReader(simulatedResult.discoveredReaders[0]);
      
      if (connectResult && !connectResult.error) {
        console.log("Simulateur connecté avec succès");
        this.setState({ 
          readerStatus: "connected",
          readerError: null,
          usingSimulator: true
        });
      } else {
        throw new Error("Impossible de se connecter au simulateur");
      }
    } catch (err) {
      console.error("Erreur connexion simulateur:", err.message);
      this.setState({ 
        readerStatus: "error",
        readerError: err.message 
      });
    }
  };

  initializeBackendClientAndTerminal(url) {
    this.client = new Client(url);
    this.terminal = window.StripeTerminal.create({
      onFetchConnectionToken: async () => {
        const tokenResult = await this.client.createConnectionToken();
        return tokenResult.secret;
      },
      onUnexpectedReaderDisconnect: () => {
        this.setState({ connectionStatus: "not_connected", reader: null });
      },
      onConnectionStatusChange: (ev) => {
        this.setState({ connectionStatus: ev.status, reader: null });
      }
    });
  }

  connectToReader = async selectedReader => {
    const connectResult = await this.terminal.connectReader(selectedReader);
    if (connectResult.error) {
      console.log("Failed to connect:", connectResult.error);
    } else {
      this.setState({
        usingSimulator: selectedReader.id === "SIMULATOR",
        status: "workflows",
        discoveredReaders: [],
        reader: connectResult.reader
      });
      return connectResult;
    }
  };

  handleScreenTouch = () => {
    this.handleUserInteraction();
    const { showWelcomeScreen, sessionActive } = this.state;
    if (showWelcomeScreen && !sessionActive) {
      this.setState({ showWelcomeScreen: false, showProductSelection: true });
    }
  };

  selectProduct = (product) => {
    this.handleUserInteraction();
    this.setState({
      selectedProduct: product,
      chargeAmount: product.price,
      showProductSelection: false,
      showEmailForm: true,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: "",
      emailSubmitted: false,
      reminderSent: false,
    });
  };

  handleWantReceiptChange = (e) => {
    this.handleUserInteraction();
    this.setState({ wantReceipt: e.target.checked });
  };

  handleWantReminderChange = (e) => {
    this.handleUserInteraction();
    this.setState({ wantReminder: e.target.checked });
  };

  handleEmailChange = (e) => {
    this.handleUserInteraction();
    this.setState({ customerEmail: e.target.value });
  };

  submitEmailForm = () => {
    this.handleUserInteraction();
    const { wantReceipt, wantReminder, customerEmail } = this.state;
    if ((wantReceipt || wantReminder) && !customerEmail) {
      alert("Veuillez saisir une adresse email.");
      return;
    }
    this.setState({ emailSubmitted: true, reminderSent: false });
    this.startPaymentAuthorization();
  };

  cancelEmailForm = () => {
    this.handleUserInteraction();
    this.setState({
      showProductSelection: true,
      selectedProduct: null,
      showEmailForm: false,
    });
  };

  startPaymentAuthorization = async () => {
    const { selectedProduct, wantReceipt, customerEmail, currency, selectedTestCard } = this.state;
    if (!selectedProduct) return;

    const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
    const basePrice = selectedProduct.price;
    const pricePerMinute = basePrice / chosenMinutes;

    this.setState({ paymentInProgress: true });
    this.clearInactivityTimers();

    try {
      const createIntentResponse = await this.client.createPaymentIntent({
        amount: basePrice,
        currency: currency,
        description: `Qnook - ${selectedProduct.name}`,
        paymentMethodTypes: ["card_present"],
        email: wantReceipt ? customerEmail : undefined
      });
      const clientSecret = createIntentResponse.client_secret;

      this.terminal.setSimulatorConfiguration({
        testPaymentMethod: selectedTestCard.type,
        testCardNumber: selectedTestCard.number,
      });

      const collectResult = await this.terminal.collectPaymentMethod(clientSecret);
      if (collectResult.error) throw new Error(collectResult.error.message);

      const confirmResult = await this.terminal.processPayment(collectResult.paymentIntent);
      if (confirmResult.error) {
        alert(`Erreur de paiement : ${confirmResult.error.message}`);
        return;
      }

      this.pendingPaymentIntentId = confirmResult.paymentIntent.id;
      this.currentAuthorizedAmount = basePrice;
      this.pricePerMinute = pricePerMinute;

      const startTime = Date.now();
      this.setState({
        sessionStartTime: startTime,
        sessionActive: true,
        showEmailForm: false,
        paymentInProgress: false,
        showProductSelection: false,
        showWelcomeScreen: false,
      });
      
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => this.forceUpdate(), 1000);

      try {
        await fetch('http://localhost:5000/ouvrir', { method: 'POST' });
        console.log("Serrure ouverte");
      } catch (err) {
        console.error("Erreur ouverture serrure :", err);
      }

    } catch (err) {
      console.error("Erreur startPaymentAuthorization:", err);
      alert(`Erreur : ${err.message}`);
      this.setState({ paymentInProgress: false });
    }
  };

  endSession = async () => {
    if (this.state.paymentInProgress) return;
    if (!this.state.sessionStartTime || !this.state.selectedProduct || !this.pendingPaymentIntentId) {
      alert("Aucune session en cours");
      return;
    }

    this.setState({ paymentInProgress: true });

    const elapsedMs = Date.now() - this.state.sessionStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const chosenMinutes = parseInt(this.state.selectedProduct.name.split(' ')[0]);
    const extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
    const extraAmount = extraMinutes * EXTRA_MINUTE_PRICE;
    const totalDue = this.state.selectedProduct.price + extraAmount;

    let finalCaptureAmount = Math.min(totalDue, this.currentAuthorizedAmount);

    const productPrice = (this.state.selectedProduct.price / 100).toFixed(2);
    const totalPrice = (finalCaptureAmount / 100).toFixed(2);
    let description = `Produit : ${chosenMinutes} min (${productPrice} EUR) - Total : ${totalPrice} EUR`;

    try {
      await fetch(`${this.state.backendURL}/update-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: this.pendingPaymentIntentId,
          description: description
        })
      }).catch(e => console.warn);

      const captureResponse = await fetch(`${this.state.backendURL}/capture-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: this.pendingPaymentIntentId,
          amountToCapture: finalCaptureAmount
        })
      });
      if (!captureResponse.ok) throw new Error((await captureResponse.json()).error);

      alert(`Paiement reussi!\nTemps reel : ${elapsedMinutes} min\nMontant : ${totalPrice} EUR`);
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.resetSession();
    } catch (err) {
      console.error("Erreur endSession:", err);
      alert(`Erreur : ${err.message}`);
    } finally {
      this.setState({ paymentInProgress: false });
    }
  };

  resetSession = () => {
    this.setState({
      sessionActive: false,
      sessionStartTime: null,
      showProductSelection: false,
      showWelcomeScreen: true,
      selectedProduct: null,
      chargeAmount: 100,
      paymentInProgress: false,
      showEmailForm: false,
      emailSubmitted: false,
      reminderSent: false,
      pendingPaymentIntentId: null,
      currentAuthorizedAmount: 0,
      pricePerMinute: 0,
      showKeyboard: false,
    });
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.resetInactivityTimers();
  };

  cancelSession = () => {
    this.resetSession();
  };

  onSetBackendURL = url => {
    if (url !== null) {
      window.localStorage.setItem("terminal.backendUrl", url);
    } else {
      window.localStorage.removeItem("terminal.backendUrl");
    }
    this.initializeBackendClientAndTerminal(url);
    this.setState({ backendURL: url }, () => {
      this.loadProducts();
    });
    this.resetInactivityTimers();
  };

  renderForm() {
    const {
      showWelcomeScreen,
      showProductSelection,
      showEmailForm,
      emailSubmitted,
      selectedProduct,
      products,
      wantReceipt,
      wantReminder,
      customerEmail,
      sessionActive,
      paymentInProgress,
      reader,
      readerStatus,
      readerError,
      sessionStartTime,
    } = this.state;

    // Écran de chargement
    if (readerStatus === "initializing") {
      return <LoadingScreen 
        message="Connexion au lecteur..." 
        submessage="Veuillez patienter..."
      />;
    }

    // Écran d'erreur
    if (readerStatus === "error") {
      return <ErrorScreen 
        title="Erreur de connexion"
        message={readerError}
        onRetry={() => this.autoConnectSimulator()}
      />;
    }

    // Écran d'accueil
    if (showWelcomeScreen) {
      return (
        <WelcomeScreen 
          onTouch={this.handleScreenTouch}
          readerStatus={readerStatus}
          showBadge={true}
        />
      );
    }

    // Sélection produits
    if (showProductSelection && reader && !sessionActive && !showEmailForm) {
      if (products.length === 0) {
        return <LoadingScreen message="Chargement des produits..." />;
      }
      return (
        <div css={css`
          background-color: #F5F5F7;
          min-height: 100vh;
          padding: 0;
        `}>
          <ProductGrid 
            products={products}
            onSelectProduct={this.selectProduct}
          />
        </div>
      );
    }

    // Formulaire email
    if (showEmailForm && !emailSubmitted) {
      return (
        <div css={css`
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #F5F5F7;
          padding: 24px;
        `}>
          <div css={css`
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          `}>
            <h2 css={css`margin-bottom: 24px;`}>
              Options de la session
            </h2>

            <p css={css`
              margin-bottom: 24px;
              color: #6B7280;
            `}>
              Vous avez choisi : <strong>{selectedProduct?.name}</strong>
              <br />
              <strong css={css`color: #0066FF;`}>
                {(selectedProduct?.price / 100).toFixed(2)} EUR
              </strong>
            </p>

            <div css={css`margin-bottom: 24px;`}>
              <label css={css`
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
              `}>
                <input 
                  type="checkbox" 
                  checked={wantReceipt} 
                  onChange={this.handleWantReceiptChange}
                />
                Recevoir le recu par email
              </label>
            </div>

            {selectedProduct && parseInt(selectedProduct.name.split(' ')[0]) > 5 && (
              <div css={css`margin-bottom: 24px;`}>
                <label css={css`
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  cursor: pointer;
                `}>
                  <input 
                    type="checkbox" 
                    checked={wantReminder} 
                    onChange={this.handleWantReminderChange}
                  />
                  Recevoir un rappel 5 min avant la fin
                </label>
              </div>
            )}

            {(wantReceipt || wantReminder) && (
              <div css={css`margin-bottom: 24px;`}>
                <label css={css`
                  display: block;
                  font-weight: 600;
                  margin-bottom: 8px;
                  color: #1A1A2E;
                `}>Email :</label>
                <input 
                  type="email" 
                  value={customerEmail} 
                  onChange={this.handleEmailChange}
                  placeholder="votre.email@example.com"
                  css={css`
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #E5E7EB;
                    border-radius: 8px;
                    font-size: 1rem;
                  `}
                />
              </div>
            )}

            <div css={css`
              display: flex;
              gap: 12px;
              margin-top: 32px;
              flex-wrap: wrap;
            `}>
              <button 
                onClick={this.submitEmailForm} 
                disabled={paymentInProgress}
                css={css`
                  flex: 1;
                  padding: 16px;
                  background-color: #0066FF;
                  color: white;
                  border: none;
                  border-radius: 10px;
                  font-weight: 700;
                  cursor: pointer;
                  font-size: 1.1rem;
                  transition: all 0.3s ease;
                  opacity: ${paymentInProgress ? 0.6 : 1};
                  
                  &:hover:not(:disabled) {
                    background-color: #0052CC;
                    transform: translateY(-2px);
                  }
                `}
              >
                Demarrer la session
              </button>
              <button 
                onClick={this.cancelEmailForm}
                css={css`
                  flex: 1;
                  padding: 16px;
                  background-color: #E5E7EB;
                  color: #1A1A2E;
                  border: none;
                  border-radius: 10px;
                  font-weight: 700;
                  cursor: pointer;
                  font-size: 1.1rem;
                  transition: all 0.3s ease;
                  
                  &:hover {
                    background-color: #D1D5DB;
                  }
                `}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Session active
    if (sessionActive) {
      const elapsedMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return (
        <SessionScreen
          minutes={minutes}
          seconds={seconds}
          productName={selectedProduct?.name}
          productPrice={`${(selectedProduct?.price / 100).toFixed(2)} EUR`}
          onEnd={this.endSession}
          onCancel={this.cancelSession}
          isPaymentInProgress={paymentInProgress}
        />
      );
    }

    return null;
  }

  render() {
    return (
      <div css={css`
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      `}>
        {this.renderForm()}
      </div>
    );
  }
}

export default App;
