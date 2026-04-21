import React, { Component } from "react";

import Client from "../client";
import Logger from "../logger";

import BackendURLForm from "../Forms/BackendURLForm.jsx";
import CommonWorkflows from "../Forms/CommonWorkflows.jsx";
import RefundForm from "../Forms/RefundForm.jsx";
import CartForm from "../Forms/CartForm.jsx";
import ConnectionInfo from "../ConnectionInfo/ConnectionInfo.jsx";
import Readers from "../Forms/Readers.jsx";
import Group from "./Group/Group.jsx";
import Logs from "../Logs/Logs.jsx";

import { css } from "emotion";

const DEFAULT_BACKEND_URL = 'https://qnook-backend-unified.onrender.com';
const EXTRA_MINUTE_PRICE = 100; // 1,00 € par minute supplémentaire
const INCREMENT_STEP_MINUTES = 5;
const MAX_INCREMENT_ATTEMPTS = 20;

const testCards = [
  { name: "Visa (succès)", number: "4242424242424242", type: "visa" },
  { name: "Refus - fonds insuffisants", number: "4000000000009995", type: "charge_declined_insufficient_funds" },
];

// ========== COMPOSANT CLAVIER VIRTUEL INTÉGRÉ (sans dépendance externe) ==========
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
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '{enter}'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '@', '.', '{enter}']
    ];

    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f0f0f0', padding: '10px', borderTop: '1px solid #ccc', zIndex: 1000 }}>
        {keys.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>
            {row.map(key => (
              <button
                key={key}
                onClick={() => this.handleKeyPress(key)}
                style={{
                  width: key === '{enter}' ? '80px' : (key === '{bksp}' ? '70px' : '50px'),
                  height: '50px',
                  margin: '2px',
                  fontSize: '1.2rem',
                  background: '#fff',
                  border: '1px solid #aaa',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {key === '{enter}' ? '⏎' : (key === '{bksp}' ? '⌫' : key)}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }
}
// ========== FIN COMPOSANT CLAVIER ==========

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
      selectedTestCard: testCards[0],
      pendingPaymentIntentId: null,
      currentAuthorizedAmount: 0,
      pricePerMinute: 0,
      showKeyboard: false,       // Pour le clavier virtuel
    };
  }

  componentDidMount() {
    this.initializeBackendClientAndTerminal(DEFAULT_BACKEND_URL);
    this.loadProducts();
    // Connexion automatique au simulateur (optionnel)
    this.autoConnectSimulator();
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
    let attempts = 0;
    while (!this.terminal && attempts < 20) {
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    if (!this.terminal) {
      console.error("Terminal non initialisé");
      return;
    }
    try {
      const simulatedResult = await this.terminal.discoverReaders({ simulated: true });
      if (simulatedResult.discoveredReaders && simulatedResult.discoveredReaders.length > 0) {
        await this.connectToReader(simulatedResult.discoveredReaders[0]);
        console.log("Simulateur connecté automatiquement");
      } else {
        console.error("Aucun simulateur trouvé");
      }
    } catch (err) {
      console.error("Erreur connexion auto au simulateur:", err);
    }
  };

  isWorkflowDisabled = () => this.state.cancelablePayment || this.state.workFlowInProgress;

  runWorkflow = async (workflowName, workflowFn) => {
    this.setState({ workFlowInProgress: workflowName });
    try {
      await workflowFn();
    } finally {
      this.setState({ workFlowInProgress: null });
    }
  };

  initializeBackendClientAndTerminal(url) {
    this.client = new Client(url);
    this.terminal = window.StripeTerminal.create({
      onFetchConnectionToken: async () => {
        const tokenResult = await this.client.createConnectionToken();
        return tokenResult.secret;
      },
      onUnexpectedReaderDisconnect: Logger.tracedFn(
        "onUnexpectedReaderDisconnect",
        "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-create",
        () => {
          this.setState({ connectionStatus: "not_connected", reader: null });
        }
      ),
      onConnectionStatusChange: Logger.tracedFn(
        "onConnectionStatusChange",
        "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-create",
        ev => {
          this.setState({ connectionStatus: ev.status, reader: null });
        }
      )
    });
    Logger.watchObject(this.client, "backend", {
      createConnectionToken: { docsUrl: "https://stripe.com/docs/terminal/sdk/js#connection-token" },
      registerDevice: { docsUrl: "https://stripe.com/docs/terminal/readers/connecting/verifone-p400#register-reader" },
      createPaymentIntent: { docsUrl: "https://stripe.com/docs/terminal/payments#create" },
      capturePaymentIntent: { docsUrl: "https://stripe.com/docs/terminal/payments#capture" },
      savePaymentMethodToCustomer: { docsUrl: "https://stripe.com/docs/terminal/payments/saving-cards" }
    });
    Logger.watchObject(this.terminal, "terminal", {
      discoverReaders: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#discover-readers" },
      connectReader: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#connect-reader" },
      disconnectReader: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#disconnect" },
      setReaderDisplay: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#set-reader-display" },
      collectPaymentMethod: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#collect-payment-method" },
      cancelCollectPaymentMethod: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#cancel-collect-payment-method" },
      processPayment: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#process-payment" },
      readReusableCard: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#read-reusable-card" },
      cancelReadReusableCard: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#cancel-read-reusable-card" },
      collectRefundPaymentMethod: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-collectrefundpaymentmethod" },
      processRefund: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-processrefund" },
      cancelCollectRefundPaymentMethod: { docsUrl: "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-cancelcollectrefundpaymentmethod" }
    });
  }

  discoverReaders = async () => {
    this.setState({ discoveryWasCancelled: false });
    const discoverResult = await this.terminal.discoverReaders();
    if (discoverResult.error) {
      console.log("Failed to discover: ", discoverResult.error);
      return discoverResult.error;
    }
    if (this.state.discoveryWasCancelled) return;
    this.setState({ discoveredReaders: discoverResult.discoveredReaders });
    return discoverResult.discoveredReaders;
  };

  cancelDiscoverReaders = () => this.setState({ discoveryWasCancelled: true });

  connectToSimulator = async () => {
    const simulatedResult = await this.terminal.discoverReaders({ simulated: true });
    await this.connectToReader(simulatedResult.discoveredReaders[0]);
  };

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

  disconnectReader = async () => {
    await this.terminal.disconnectReader();
    this.setState({ reader: null, sessionActive: false, sessionStartTime: null, pendingPaymentIntentId: null });
    if (this.timerInterval) clearInterval(this.timerInterval);
  };

  registerAndConnectNewReader = async (label, registrationCode, location) => {
    try {
      let reader = await this.client.registerDevice({ label, registrationCode, location });
      await this.connectToReader(reader);
      console.log("Registered and Connected Successfully!");
    } catch (e) {}
  };

  updateLineItems = async () => {
    await this.terminal.setReaderDisplay({
      type: "cart",
      cart: {
        line_items: [{ description: this.state.itemDescription, amount: this.state.chargeAmount, quantity: 1 }],
        tax: this.state.taxAmount,
        total: this.state.chargeAmount + this.state.taxAmount,
        currency: this.state.currency
      }
    });
    console.log("Reader Display Updated!");
  };

  computeAuthorizationAmount(priceInCents, durationMinutes) {
    if (durationMinutes < 30) {
      return priceInCents * 2;
    } else {
      return Math.ceil(priceInCents * 1.5);
    }
  }

  handleInsufficientFunds = (currentDuration, originalProduct) => {
    const newDuration = Math.floor(currentDuration / 2);
    if (newDuration < 1) {
      alert("Aucune durée n'est possible avec votre carte. Veuillez utiliser un autre moyen de paiement.");
      this.cancelEmailForm();
      return;
    }
    const originalMinutes = parseInt(originalProduct.name.split(' ')[0]);
    const newPrice = (newDuration / originalMinutes) * originalProduct.price;
    const tempProduct = {
      ...originalProduct,
      name: `${newDuration} min`,
      price: Math.ceil(newPrice)
    };
    this.setState({ selectedProduct: tempProduct });
    this.startPaymentAuthorization();
  };

  startPaymentAuthorization = async () => {
    const { selectedProduct, wantReceipt, customerEmail, currency, selectedTestCard } = this.state;
    if (!selectedProduct) return;

    const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
    const basePrice = selectedProduct.price;
    const authAmount = this.computeAuthorizationAmount(basePrice, chosenMinutes);
    const pricePerMinute = basePrice / chosenMinutes;

    this.setState({ paymentInProgress: true });

    try {
      const createIntentResponse = await this.client.createPaymentIntent({
        amount: authAmount,
        currency: currency,
        description: `Pré-autorisation Qnook - ${selectedProduct.name}`,
        paymentMethodTypes: ["card_present"],
        email: wantReceipt ? customerEmail : undefined
      });
      const clientSecret = createIntentResponse.client_secret;

      const simulatorConfiguration = {
        testPaymentMethod: selectedTestCard.type,
        testCardNumber: selectedTestCard.number,
      };
      if (this.state.simulateOnReaderTip) simulatorConfiguration.tipAmount = Number(this.state.tipAmount);
      this.terminal.setSimulatorConfiguration(simulatorConfiguration);

      const collectResult = await this.terminal.collectPaymentMethod(clientSecret);
      if (collectResult.error) throw new Error(collectResult.error.message);

      const confirmResult = await this.terminal.processPayment(collectResult.paymentIntent);
      if (confirmResult.error) {
        if (confirmResult.error.code === 'insufficient_funds' || confirmResult.error.message.includes('insufficient_funds')) {
          this.handleInsufficientFunds(chosenMinutes, selectedProduct);
        } else {
          alert(`Erreur de paiement : ${confirmResult.error.message}`);
        }
        return;
      }

      this.pendingPaymentIntentId = confirmResult.paymentIntent.id;
      this.currentAuthorizedAmount = authAmount;
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
      this.timerInterval = setInterval(() => this.checkReminderAndUpdate(), 1000);
    } catch (err) {
      console.error("Erreur startPaymentAuthorization:", err);
      alert(`Erreur : ${err.message}`);
      this.setState({ paymentInProgress: false });
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
    this.setState({ wantReceipt: e.target.checked });
  };

  handleWantReminderChange = (e) => {
    this.setState({ wantReminder: e.target.checked });
  };

  handleEmailChange = (e) => {
    this.setState({ customerEmail: e.target.value });
  };

  // Gestion du clavier virtuel
  handleEmailFocus = () => {
    this.setState({ showKeyboard: true });
  };

  handleKeyboardChange = (value) => {
    this.setState({ customerEmail: value });
  };

  handleKeyboardEnter = (value) => {
    this.setState({ showKeyboard: false, customerEmail: value });
  };

  handleTestCardChange = (e) => {
    const card = testCards.find(c => c.number === e.target.value);
    if (card) this.setState({ selectedTestCard: card });
  };

  submitEmailForm = () => {
    const { wantReceipt, wantReminder, customerEmail } = this.state;
    if ((wantReceipt || wantReminder) && !customerEmail) {
      alert("Veuillez saisir une adresse email.");
      return;
    }
    this.setState({ emailSubmitted: true, reminderSent: false });
    this.startPaymentAuthorization();
  };

  cancelEmailForm = () => {
    this.setState({
      showProductSelection: true,
      selectedProduct: null,
      showEmailForm: false,
    });
  };

  checkReminderAndUpdate = () => {
    const { sessionStartTime, selectedProduct, wantReminder, reminderSent, customerEmail, backendURL } = this.state;
    if (!sessionStartTime || !selectedProduct) return;

    const elapsedMs = Date.now() - sessionStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);

    if (wantReminder && !reminderSent && chosenMinutes > 5 && elapsedMinutes >= chosenMinutes - 5) {
      this.sendReminder();
      this.setState({ reminderSent: true });
    }

    this.forceUpdate();
  };

  sendReminder = async () => {
    const { customerEmail, selectedProduct, backendURL } = this.state;
    if (!customerEmail || !selectedProduct) return;
    const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
    try {
      await fetch(`${backendURL}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          productName: selectedProduct.name,
          durationChosen: chosenMinutes,
        }),
      });
    } catch (err) {
      console.error("Erreur envoi rappel:", err);
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
    let extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
    const extraAmount = extraMinutes * EXTRA_MINUTE_PRICE;
    const totalDue = this.state.selectedProduct.price + extraAmount;

    let finalCaptureAmount = Math.min(totalDue, this.currentAuthorizedAmount);
    let needIncrement = totalDue > this.currentAuthorizedAmount;

    if (needIncrement) {
      let currentAuth = this.currentAuthorizedAmount;
      let attempts = 0;
      const stepCents = Math.ceil(this.pricePerMinute * INCREMENT_STEP_MINUTES);
      while (currentAuth < totalDue && attempts < MAX_INCREMENT_ATTEMPTS) {
        const nextAmount = Math.min(totalDue, currentAuth + stepCents);
        const roundedAmount = Math.ceil(nextAmount);
        try {
          const response = await fetch(`${this.state.backendURL}/increment-authorization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: this.pendingPaymentIntentId,
              newAmount: roundedAmount
            })
          });
          if (!response.ok) throw new Error((await response.json()).error);
          currentAuth = roundedAmount;
        } catch (err) {
          console.error("Incrémentation refusée", err);
          break;
        }
        attempts++;
        await new Promise(r => setTimeout(r, 300));
      }
      finalCaptureAmount = Math.min(totalDue, currentAuth);
    }

    const capturedMinutes = Math.floor(finalCaptureAmount / this.pricePerMinute);
    const capturedExtra = Math.max(0, capturedMinutes - chosenMinutes);

    const productPrice = (this.state.selectedProduct.price / 100).toFixed(2);
    const extraPrice = (capturedExtra * this.pricePerMinute / 100).toFixed(2);
    const totalPrice = (finalCaptureAmount / 100).toFixed(2);
    let description = `Produit : ${chosenMinutes} min (${productPrice} €)`;
    if (capturedExtra > 0) {
      description += `\nSupplément : ${capturedExtra} min (${extraPrice} €)`;
    }
    description += `\nTotal : ${totalPrice} €`;

    try {
      try {
        await fetch(`${this.state.backendURL}/update-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: this.pendingPaymentIntentId,
            description: description
          })
        });
      } catch (e) {}

      const captureResponse = await fetch(`${this.state.backendURL}/capture-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: this.pendingPaymentIntentId,
          amountToCapture: finalCaptureAmount
        })
      });
      if (!captureResponse.ok) throw new Error((await captureResponse.json()).error);

      let msg = `✅ Paiement réussi !\n📆 Temps réel : ${elapsedMinutes} min\n💰 Montant facturé : ${(finalCaptureAmount/100).toFixed(2)} €`;
      alert(msg);

      if (this.timerInterval) clearInterval(this.timerInterval);
      this.resetSession();
    } catch (err) {
      console.error("Erreur endSession:", err);
      alert(`❌ Erreur : ${err.message}`);
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
  };

  cancelSession = () => {
    this.resetSession();
  };

  collectRefundPaymentMethod = async () => {
    this.setState({ cancelableRefund: true });
    try {
      const readResult = await this.terminal.collectRefundPaymentMethod(
        this.state.refundedChargeID,
        this.state.refundedAmount,
        "cad"
      );
      if (readResult.error) {
        alert(`collectRefundPaymentMethod failed: ${readResult.error.message}`);
        this.setState({ cancelableRefund: false });
      } else {
        const refund = await this.terminal.processRefund();
        if (refund.error) {
          alert(`processRefund failed: ${refund.error.message}`);
        } else {
          console.log("Charge fully refunded!");
          this.setState({
            cancelableRefund: false,
            refundedAmount: null,
            refundedChargeID: null
          });
          return refund;
        }
      }
    } finally {
      this.setState({ cancelableRefund: false });
    }
  };

  cancelPendingRefund = async () => {
    await this.terminal.cancelCollectRefundPaymentMethod();
    this.setState({ cancelableRefund: false, refundedAmount: null, refundedChargeID: null });
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
  };

  updateChargeAmount = amount => this.setState({ chargeAmount: parseInt(amount, 10) });
  updateItemDescription = description => this.setState({ itemDescription: description });
  updateTaxAmount = amount => this.setState({ taxAmount: parseInt(amount || 0, 10) });
  updateCurrency = currency => this.setState({ currency: currency });
  updateRefundChargeID = id => this.setState({ refundedChargeID: id });
  updateRefundAmount = amount => this.setState({ refundedAmount: parseInt(amount, 10) });

  onChangeTestPaymentMethod = testPaymentMethod => this.setState({ testPaymentMethod });
  onChangeTestCardNumber = testCardNumber => this.setState({ testCardNumber });
  onChangeTipAmount = tipAmount => this.setState({ tipAmount });
  onChangeSimulateOnReaderTip = simulateOnReaderTip => this.setState({ simulateOnReaderTip });

  renderPrice(product) {
    if (product.promo && product.promo.type === "percent") {
      const finalPrice = product.price * (1 - product.promo.value / 100);
      return (
        <span>
          <span style={{ textDecoration: 'line-through', fontSize: '0.8rem' }}>{(product.price / 100).toFixed(2)} €</span>
          {' '}
          <span style={{ color: 'red', fontWeight: 'bold' }}>{(finalPrice / 100).toFixed(2)} €</span>
        </span>
      );
    } else if (product.promo && product.promo.type === "fixed") {
      const finalPrice = Math.max(0, product.price - product.promo.value);
      return (
        <span>
          <span style={{ textDecoration: 'line-through', fontSize: '0.8rem' }}>{(product.price / 100).toFixed(2)} €</span>
          {' '}
          <span style={{ color: 'red', fontWeight: 'bold' }}>{(finalPrice / 100).toFixed(2)} €</span>
        </span>
      );
    }
    return <span>{(product.price / 100).toFixed(2)} €</span>;
  }

  renderForm() {
    const {
      backendURL,
      showWelcomeScreen,
      showProductSelection,
      showEmailForm,
      emailSubmitted,
      selectedProduct,
      products,
      wantReceipt,
      wantReminder,
      customerEmail,
      selectedTestCard,
      sessionActive,
      paymentInProgress,
      reader,
      discoveredReaders,
      showKeyboard,
    } = this.state;

    // Écran d'accueil en veille
    if (showWelcomeScreen) {
      return (
        <div
          onClick={this.handleScreenTouch}
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#1a1a2e',
            color: 'white',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>🛋️ Qnook</h1>
          <p style={{ fontSize: '1.5rem' }}>Bienvenue chez Qnook</p>
          <p style={{ fontSize: '1rem', marginTop: '40px', color: '#aaa' }}>Touchez l'écran pour commencer</p>
        </div>
      );
    }

    // Sélection des produits
    if (showProductSelection && backendURL && reader && !sessionActive && !showEmailForm) {
      if (products.length === 0) return <div>Chargement des produits...</div>;
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Choisissez votre durée</h2>
          <p style={{ marginBottom: '30px', color: '#555' }}>Touchez la durée qui vous convient</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => this.selectProduct(product)}
                style={{
                  width: '150px',
                  padding: '20px',
                  fontSize: '1.2rem',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '3rem' }}>{product.image || '🕐'}</div>
                <div>{product.name}</div>
                <div>{this.renderPrice(product)}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Formulaire email
    if (showEmailForm && !emailSubmitted) {
      return (
        <div style={{ maxWidth: '500px', margin: '100px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '10px', textAlign: 'center' }}>
          <h2>Options de la session</h2>
          <p>Vous avez choisi : <strong>{selectedProduct?.name} ({this.renderPrice(selectedProduct)})</strong></p>
          <div style={{ marginBottom: '10px' }}>
            <label><input type="checkbox" checked={wantReceipt} onChange={this.handleWantReceiptChange} /> Recevoir le reçu par email</label>
          </div>
          {selectedProduct && parseInt(selectedProduct.name.split(' ')[0]) > 5 && (
            <div style={{ marginBottom: '10px' }}>
              <label><input type="checkbox" checked={wantReminder} onChange={this.handleWantReminderChange} /> Recevoir un rappel 5 min avant la fin</label>
            </div>
          )}
          {(wantReceipt || wantReminder) && (
            <div style={{ marginBottom: '10px' }}>
              <label>Email :</label>
              <input 
                type="email" 
                value={customerEmail} 
                onChange={this.handleEmailChange} 
                onFocus={this.handleEmailFocus}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
              />
            </div>
          )}
          <div style={{ marginTop: '20px' }}>
            <button onClick={this.submitEmailForm} disabled={paymentInProgress} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Démarrer la session
            </button>
            <button onClick={this.cancelEmailForm} style={{ marginLeft: '10px', padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Annuler</button>
          </div>
          {/* AFFICHAGE DU CLAVIER VIRTUEL */}
          {showKeyboard && (
            <SimpleKeyboard 
              onChange={this.handleKeyboardChange} 
              onEnter={this.handleKeyboardEnter} 
            />
          )}
        </div>
      );
    }

    // Connexion initiale
    if (!this.client) {
      return <div>Connexion au service...</div>;
    }
    
    if (!reader) {
      return <Readers onClickDiscover={() => this.discoverReaders()} onClickCancelDiscover={() => this.cancelDiscoverReaders()} onSubmitRegister={this.registerAndConnectNewReader} readers={discoveredReaders} onConnectToReader={this.connectToReader} handleUseSimulator={this.connectToSimulator} listLocations={this.client.listLocations} />;
    }

    // Session active
    if (sessionActive) {
      const elapsedMs = this.state.sessionStartTime ? Date.now() - this.state.sessionStartTime : 0;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>Session en cours</h2>
          <p>Produit : {this.state.selectedProduct?.name} ({this.renderPrice(this.state.selectedProduct)})</p>
          <p style={{ fontSize: '3rem', fontFamily: 'monospace' }}>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</p>
          <button onClick={this.endSession} disabled={paymentInProgress} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {paymentInProgress ? "Paiement en cours..." : "Terminer et payer"}
          </button>
          <button onClick={this.cancelSession} style={{ marginLeft: '10px', padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Annuler</button>
        </div>
      );
    }

    return null;
  }

  render() {
    const { backendURL, reader } = this.state;
    return (
      <div className={css`display: flex; align-items: center; justify-content: center; min-height: 100vh;`}>
        {/* ConnectionInfo commenté pour masquer l'info lecteur */}
        {/* {backendURL && reader && <ConnectionInfo ... />} */}
        {this.renderForm()}
      </div>
    );
  }
}

export default App;
