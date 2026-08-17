import React, { Component } from "react";
import { css } from "@emotion/react";

import Client from "../client";
import Logger from "../logger";

import { colors, gradients, spacing, transitions, shadows } from "../styles/colors";
import { WelcomeScreen } from "./WelcomeScreen";
import { LoadingScreen } from "./LoadingScreen";
import { ErrorScreen } from "./ErrorScreen";
import { Button } from "./Button";
import { Card, InfoBox, AlertBox, Badge } from "./Card";
import { ProductGrid } from "./ProductGrid";
import { SessionScreen } from "./SessionScreen";

const DEFAULT_BACKEND_URL = 'https://qnook-backend-unified.onrender.com';
const EXTRA_MINUTE_PRICE = 50;

class SimpleKeyboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '' };
  }

  handleKeyPress = (key) => {
    let newValue = this.state.value;
    if (key === '{enter}') {
      if (this.props.onEnter) this.props.onEnter(newValue);
      this.setState({ value: '' });
    } else if (key === '{bksp}') {
      newValue = newValue.slice(0, -1);
      this.setState({ value: newValue });
      if (this.props.onChange) this.props.onChange(newValue);
    } else {
      newValue += key;
      this.setState({ value: newValue });
      if (this.props.onChange) this.props.onChange(newValue);
    }
  };

  render() {
    const keys = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '{bksp}'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '{enter}']
    ];

    return (
      <div css={css`
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: ${colors.light};
        padding: ${spacing.sm};
        border-top: 1px solid ${colors.border};
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
      `}>
        {keys.map((row, i) => (
          <div key={i} css={css`
            display: flex;
            justify-content: center;
            margin-bottom: ${spacing.xs};
          `}>
            {row.map(key => (
              <button
                key={key}
                onClick={() => this.handleKeyPress(key)}
                css={css`
                  width: ${key === '{enter}' ? '60px' : (key === '{bksp}' ? '60px' : '40px')};
                  height: 36px;
                  margin: 1px;
                  font-size: 0.9rem;
                  background: ${colors.white};
                  border: 1px solid ${colors.border};
                  border-radius: 4px;
                  cursor: pointer;
                  transition: all ${transitions.fast};
                  
                  &:hover {
                    background: ${colors.light};
                    border-color: ${colors.primary};
                  }
                  
                  &:active {
                    background: ${colors.primaryLight};
                  }
                `}
              >
                {key === '{enter}' ? '⏎' : (key === '{bksp}' ? '⌫' : key)}
              </button>
            ))}
          </div>
        ))}
        <Button 
          variant="danger"
          size="small"
          onClick={() => this.props.onClose && this.props.onClose()}
          css={css`margin-top: ${spacing.sm};`}
        >
          Fermer
        </Button>
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "requires_initializing",
      backendURL: DEFAULT_BACKEND_URL,
      discoveredReaders: [],
      connectionStatus: "not_connected",
      reader: null,
      showProductSelection: false,
      showEmailForm: false,
      emailSubmitted: false,
      selectedProduct: null,
      products: [],
      sessionActive: false,
      paymentInProgress: false,
      showWelcomeScreen: true,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: "",
      sessionStartTime: null,
      showKeyboard: false,
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
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadProducts = async () => {
    const { backendURL } = this.state;
    if (!backendURL) return;
    try {
      const response = await fetch(`${backendURL}/api/products`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.setState({ products: data });
    } catch (err) {
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
        status: "workflows",
        discoveredReaders: [],
        reader: connectResult.reader
      });
      return connectResult;
    }
  };

  handleScreenTouch = () => {
    const { showWelcomeScreen, sessionActive } = this.state;
    if (showWelcomeScreen && !sessionActive) {
      this.setState({ showWelcomeScreen: false, showProductSelection: true });
    }
  };

  selectProduct = (product) => {
    this.setState({
      selectedProduct: product,
      showProductSelection: false,
      showEmailForm: true,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: "",
      emailSubmitted: false,
    });
  };

  handleWantReceiptChange = (e) => {
    this.setState({ wantReceipt: e.target.checked });
  };

  handleWantReminderChange = (e) => {
    this.setState({ wantReminder: e.target.checked });
  };

  handleEmailChange = (e) => {
    this.setState({ customerEmail: e.target.value });
  };

  handleEmailFocus = () => {
    this.setState({ showKeyboard: true });
  };

  handleKeyboardChange = (value) => {
    this.setState({ customerEmail: value });
  };

  handleKeyboardEnter = (value) => {
    this.setState({ showKeyboard: false, customerEmail: value });
  };

  submitEmailForm = () => {
    const { wantReceipt, wantReminder, customerEmail } = this.state;
    if ((wantReceipt || wantReminder) && !customerEmail) {
      alert("Veuillez saisir une adresse email.");
      return;
    }
    this.setState({ emailSubmitted: true });
    this.startPaymentAuthorization();
  };

  cancelEmailForm = () => {
    this.setState({
      showProductSelection: true,
      selectedProduct: null,
      showEmailForm: false,
    });
  };

  startPaymentAuthorization = async () => {
    const { selectedProduct, wantReceipt, customerEmail } = this.state;
    if (!selectedProduct) return;

    const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
    const basePrice = selectedProduct.price;
    const pricePerMinute = basePrice / chosenMinutes;

    this.setState({ paymentInProgress: true });

    try {
      const createIntentResponse = await this.client.createPaymentIntent({
        amount: basePrice,
        currency: "eur",
        description: `Qnook - ${selectedProduct.name}`,
        paymentMethodTypes: ["card_present"],
        email: wantReceipt ? customerEmail : undefined
      });
      const clientSecret = createIntentResponse.client_secret;

      this.terminal.setSimulatorConfiguration({
        testPaymentMethod: "visa",
        testCardNumber: "4242424242424242",
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

      alert(`Paiement réussi!\nTemps réel : ${elapsedMinutes} min\nMontant : ${totalPrice} EUR`);
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
      paymentInProgress: false,
      showEmailForm: false,
      emailSubmitted: false,
      showKeyboard: false,
    });
    if (this.timerInterval) clearInterval(this.timerInterval);
  };

  cancelSession = () => {
    this.resetSession();
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
      showKeyboard,
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
          background-color: ${colors.light};
          min-height: 100vh;
          padding: ${spacing.xl} 0;
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
      const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
      
      return (
        <div css={css`
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: ${colors.light};
          padding: ${spacing.lg};
        `}>
          <Card variant="default" css={css`
            max-width: 500px;
            width: 100%;
            max-height: calc(100vh - 200px);
            overflow-y: auto;
          `}>
            <h2 css={css`margin-bottom: ${spacing.lg};`}>
              ⚙️ Options de la session
            </h2>

            <p css={css`
              margin-bottom: ${spacing.lg};
              color: ${colors.textSecondary};
            `}>
              Vous avez choisi : <strong>{selectedProduct?.name}</strong>
              <br />
              <strong css={css`color: ${colors.primary};`}>
                {(selectedProduct?.price / 100).toFixed(2)} EUR
              </strong>
            </p>

            <InfoBox title="ℹ️ Comment ça fonctionne">
              <ul css={css`
                list-style: none;
                padding: 0;
                margin: 0;
                
                li {
                  margin-bottom: ${spacing.sm};
                }
              `}>
                <li>• Pré-autorisation (×2) – aucun débit immédiat</li>
                <li>• Temps supplémentaire : <strong>0,50 €/min</strong></li>
                <li>• Vous ne payez que le temps réel</li>
              </ul>
            </InfoBox>

            <div css={css`margin-bottom: ${spacing.lg};`}>
              <label css={css`
                display: flex;
                align-items: center;
                gap: ${spacing.md};
                cursor: pointer;
                
                input {
                  cursor: pointer;
                }
              `}>
                <input 
                  type="checkbox" 
                  checked={wantReceipt} 
                  onChange={this.handleWantReceiptChange}
                />
                Recevoir le reçu par email
              </label>
            </div>

            {chosenMinutes > 5 && (
              <div css={css`margin-bottom: ${spacing.lg};`}>
                <label css={css`
                  display: flex;
                  align-items: center;
                  gap: ${spacing.md};
                  cursor: pointer;
                  
                  input {
                    cursor: pointer;
                  }
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
              <div css={css`
                margin-bottom: ${spacing.lg};
                
                label {
                  display: block;
                  font-weight: 600;
                  margin-bottom: ${spacing.sm};
                  color: ${colors.text};
                }
                
                input {
                  width: 100%;
                }
              `}>
                <label>📧 Email :</label>
                <input 
                  type="email" 
                  value={customerEmail} 
                  onChange={this.handleEmailChange} 
                  onFocus={this.handleEmailFocus}
                  placeholder="votre.email@example.com"
                />
              </div>
            )}

            <div css={css`
              display: flex;
              gap: ${spacing.md};
              margin-top: ${spacing.xl};
              flex-wrap: wrap;
            `}>
              <Button 
                variant="primary"
                fullWidth
                onClick={this.submitEmailForm} 
                disabled={paymentInProgress}
              >
                🚀 Démarrer la session
              </Button>
              <Button 
                variant="secondary"
                fullWidth
                onClick={this.cancelEmailForm}
              >
                ❌ Annuler
              </Button>
            </div>

            {showKeyboard && (
              <>
                <div css={css`
                  position: fixed;
                  bottom: 210px;
                  left: ${spacing.lg};
                  right: ${spacing.lg};
                  background: ${colors.primaryLight};
                  padding: ${spacing.md};
                  border-radius: 8px;
                  text-align: center;
                  font-size: 0.9rem;
                  z-index: 999;
                  color: ${colors.primary};
                `}>
                  📧 {customerEmail || 'Saisissez votre email...'}
                </div>
                <SimpleKeyboard 
                  onChange={this.handleKeyboardChange} 
                  onEnter={this.handleKeyboardEnter}
                  onClose={() => this.setState({ showKeyboard: false })}
                />
              </>
            )}
          </Card>
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
