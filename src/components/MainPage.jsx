import React, { Component } from "react";

import Client from "../client";
import Logger from "../ logger"; // Attention : vérifiez le chemin réel (logger.js)

import BackendURLForm from "../Forms/BackendURLForm.jsx";
import CommonWorkflows from "../Forms/CommonWorkflows.jsx";
import RefundForm from "../Forms/RefundForm.jsx";
import CartForm from "../Forms/CartForm.jsx";
import ConnectionInfo from "../ConnectionInfo/ConnectionInfo.jsx";
import Readers from "../Forms/Readers.jsx";
import Group from "./Group/Group.jsx";
import Logs from "../Logs/Logs.jsx";

import { css } from "emotion";

const EXTRA_MINUTE_PRICE = 100; // 1,00 € par minute supplémentaire

// Liste des cartes de test Stripe (pour le simulateur)
const testCards = [
  { name: "Visa (succès)", number: "4242424242424242", type: "visa" },
  { name: "Visa Débit (succès)", number: "4000056655665556", type: "visa_debit" },
  { name: "Mastercard (succès)", number: "5555555555554444", type: "mastercard" },
  { name: "Mastercard Débit (succès)", number: "5208288282828210", type: "mastercard_debit" },
  { name: "Mastercard Prépayée (succès)", number: "5105105105105100", type: "mastercard_prepaid" },
  { name: "American Express (succès)", number: "378282246310005", type: "amex" },
  { name: "American Express 2 (succès)", number: "371449635398431", type: "amex2" },
  { name: "Discover (succès)", number: "6011111111111117", type: "discover" },
  { name: "Discover 2 (succès)", number: "6011000990139424", type: "discover2" },
  { name: "Diners Club (succès)", number: "3056930009020804", type: "diners" },
  { name: "JCB (succès)", number: "3566002820360505", type: "jcb" },
  { name: "UnionPay (succès)", number: "6200000000000005", type: "unionpay" },
  { name: "Interac (succès)", number: "4506445006931933", type: "interac" },
  { name: "Carte Bancaire / Visa (succès)", number: "4000025000001001", type: "cartes_bancaires_visa_debit" },
  { name: "Carte Bancaire / Mastercard (succès)", number: "5555552500001001", type: "cartes_bancaires_mastercard_debit" },
  { name: "Girocard (succès)", number: "4711009900000316877", type: "girocard_debit" },
  { name: "Refus générique", number: "4000000000000002", type: "charge_declined" },
  { name: "Refus - fonds insuffisants", number: "4000000000009995", type: "charge_declined_insufficient_funds" },
  { name: "Refus - carte perdue", number: "4000000000009987", type: "charge_declined_lost_card" },
  { name: "Refus - carte volée", number: "4000000000009979", type: "charge_declined_stolen_card" },
  { name: "Refus - carte expirée", number: "4000000000000069", type: "charge_declined_expired_card" },
  { name: "Refus - erreur traitement", number: "4000000000000119", type: "charge_declined_processing_error" },
];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "requires_initializing",
      backendURL: null,
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
      showProductSelection: true,
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
      // Nouveaux champs pour la pré-autorisation
      pendingPaymentIntentId: null,
      currentAuthorizedAmount: 0,
    };
    this.timerInterval = null;
  }

  componentDidMount() {
    this.loadProducts();
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
          alert("Unexpected disconnect from the reader");
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

  // Calcul du montant de pré-autorisation
  computeAuthorizationAmount(priceInCents, durationMinutes) {
    if (durationMinutes < 30) {
      return priceInCents * 2;
    } else {
      return Math.ceil(priceInCents * 1.5);
    }
  }

  // Proposition d'une durée plus courte (moitié) après refus
  handleInsufficientFunds = (currentDuration, originalProduct) => {
    const newDuration = Math.floor(currentDuration / 2);
    if (newDuration < 1) {
      alert("Aucune durée n'est possible avec votre carte. Veuillez utiliser un autre moyen de paiement.");
      this.cancelEmailForm();
      return;
    }
    // Calcul du prix proportionnel
    const originalMinutes = parseInt(originalProduct.name.split(' ')[0]);
    const newPrice = (newDuration / originalMinutes) * originalProduct.price;
    // Créer un produit temporaire
    const tempProduct = {
      ...originalProduct,
      name: `${newDuration} min`,
      price: Math.ceil(newPrice) // arrondir au centime supérieur
    };
    this.setState({ selectedProduct: tempProduct });
    // Relancer la pré-autorisation
    this.startPaymentAuthorization();
  };

  // Lance la pré-autorisation (après validation des options email)
  startPaymentAuthorization = async () => {
    const { selectedProduct, wantReceipt, customerEmail, currency, selectedTestCard } = this.state;
    if (!selectedProduct) return;

    const chosenMinutes = parseInt(selectedProduct.name.split(' ')[0]);
    const basePrice = selectedProduct.price;
    const authAmount = this.computeAuthorizationAmount(basePrice, chosenMinutes);

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

      // Succès de la pré-autorisation
      this.pendingPaymentIntentId = confirmResult.paymentIntent.id;
      this.currentAuthorizedAmount = authAmount;
      const startTime = Date.now();
      this.setState({
        sessionStartTime: startTime,
        sessionActive: true,
        showEmailForm: false,
        paymentInProgress: false,
      });
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => this.checkReminderAndUpdate(), 1000);
      console.log("Pré-autorisation réussie, session démarrée");
    } catch (err) {
      console.error("Erreur startPaymentAuthorization:", err);
      alert(`Erreur : ${err.message}`);
      this.setState({ paymentInProgress: false });
    }
  };

  // Sélection d'un produit (étape 1)
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

  handleTestCardChange = (e) => {
    const card = testCards.find(c => c.number === e.target.value);
    if (card) {
      this.setState({ selectedTestCard: card });
    }
  };

  submitEmailForm = () => {
    const { wantReceipt, wantReminder, customerEmail } = this.state;
    if ((wantReceipt || wantReminder) && !customerEmail) {
      alert("Veuillez saisir une adresse email.");
      return;
    }
    this.setState({ emailSubmitted: true, reminderSent: false });
    // Lancer la pré-autorisation
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
      console.log("Rappel envoyé");
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
    const totalAmount = this.state.selectedProduct.price + extraAmount;

    const extraText = extraMinutes > 0 ? ` + ${extraMinutes} min supp` : '';
    const description = `Qnook - ${this.state.selectedProduct.name}${extraText}`;

    try {
      // Si le montant final dépasse l'autorisation, on incrémente
      if (totalAmount > this.currentAuthorizedAmount) {
        const incrementResponse = await fetch(`${this.state.backendURL}/increment-authorization`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: this.pendingPaymentIntentId,
            newAmount: totalAmount
          })
        });
        if (!incrementResponse.ok) {
          const errorData = await incrementResponse.json();
          throw new Error(errorData.error || "Erreur lors de l'incrémentation");
        }
        console.log("Autorisation incrémentée avec succès");
      }

      // Capture du paiement
      const captureResponse = await fetch(`${this.state.backendURL}/capture-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: this.pendingPaymentIntentId })
      });
      if (!captureResponse.ok) {
        const errorData = await captureResponse.json();
        throw new Error(errorData.error || "Erreur lors de la capture");
      }

      alert(`Paiement réussi !\nTemps réel : ${elapsedMinutes} min\nSupplément : ${extraMinutes} min (${(extraAmount/100).toFixed(2)} €)\nTotal : ${(totalAmount/100).toFixed(2)} €`);
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
      showProductSelection: true,
      selectedProduct: null,
      chargeAmount: 100,
      paymentInProgress: false,
      showEmailForm: false,
      emailSubmitted: false,
      reminderSent: false,
      pendingPaymentIntentId: null,
      currentAuthorizedAmount: 0,
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

  updateChargeAmount = amount => {
    this.setState({ chargeAmount: parseInt(amount, 10) });
  };
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
      cancelablePayment,
      reader,
      discoveredReaders,
      usingSimulator,
      showProductSelection,
      selectedProduct,
      sessionActive,
      paymentInProgress,
      showEmailForm,
      wantReceipt,
      wantReminder,
      customerEmail,
      emailSubmitted,
      products,
      selectedTestCard,
    } = this.state;

    if (showProductSelection && backendURL !== null && reader !== null && !sessionActive && !showEmailForm) {
      if (products.length === 0) return <div>Chargement des produits...</div>;
      return (
        <div>
          <h2 style={{ textAlign: 'center' }}>Choisissez votre durée</h2>
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

    if (showEmailForm && !emailSubmitted) {
      return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
          <h2>Options de la session</h2>
          <p>Vous avez choisi : <strong>{selectedProduct?.name} ({this.renderPrice(selectedProduct)})</strong></p>
          <p><strong>Information :</strong> Une pré-autorisation de {selectedProduct && (selectedProduct.price / 100).toFixed(2)}€ sera effectuée (garantie pour le temps supplémentaire). Seul le temps réel sera débité.</p>
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input type="checkbox" checked={wantReceipt} onChange={this.handleWantReceiptChange} />
              Recevoir le reçu final par email
            </label>
          </div>
          {selectedProduct && parseInt(selectedProduct.name.split(' ')[0]) > 5 && (
            <div style={{ marginBottom: '10px' }}>
              <label>
                <input type="checkbox" checked={wantReminder} onChange={this.handleWantReminderChange} />
                Recevoir un rappel par email 5 minutes avant la fin de la session
              </label>
            </div>
          )}
          {(wantReceipt || wantReminder) && (
            <div style={{ marginBottom: '10px' }}>
              <label>Adresse email :</label>
              <input type="email" value={customerEmail} onChange={this.handleEmailChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            </div>
          )}
          <div style={{ marginBottom: '10px' }}>
            <label>Carte de test :</label>
            <select value={selectedTestCard.number} onChange={this.handleTestCardChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
              {testCards.map(card => (
                <option key={card.number} value={card.number}>{card.name}</option>
              ))}
            </select>
            <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#555' }}>
              Numéro: <strong>{selectedTestCard.number}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={this.submitEmailForm} disabled={paymentInProgress} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {paymentInProgress ? "Pré-autorisation en cours..." : "Démarrer la session"}
            </button>
            <button onClick={this.cancelEmailForm} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      );
    }

    if (backendURL === null && reader === null) {
      return <BackendURLForm onSetBackendURL={this.onSetBackendURL} />;
    } else if (reader === null) {
      return (
        <Readers
          onClickDiscover={() => this.discoverReaders()}
          onClickCancelDiscover={() => this.cancelDiscoverReaders()}
          onSubmitRegister={this.registerAndConnectNewReader}
          readers={discoveredReaders}
          onConnectToReader={this.connectToReader}
          handleUseSimulator={this.connectToSimulator}
          listLocations={this.client.listLocations}
        />
      );
    } else if (sessionActive) {
      const elapsedMs = this.state.sessionStartTime ? Date.now() - this.state.sessionStartTime : 0;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const elapsedMinutes = Math.floor(totalSeconds / 60);
      const elapsedSeconds = totalSeconds % 60;
      const chosenMinutes = selectedProduct ? parseInt(selectedProduct.name.split(' ')[0]) : 0;
      const extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
      return (
        <div style={{ textAlign: 'center' }}>
          <h2>Session en cours</h2>
          <p>Produit : {selectedProduct?.name} ({this.renderPrice(selectedProduct)})</p>
          <p>Temps écoulé : {elapsedMinutes} min {elapsedSeconds.toString().padStart(2, '0')} s</p>
          {extraMinutes > 0 && <p>Minutes supplémentaires : {extraMinutes} min ({(extraMinutes * EXTRA_MINUTE_PRICE/100).toFixed(2)} €)</p>}
          <button onClick={this.endSession} disabled={paymentInProgress} style={{ margin: '10px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {paymentInProgress ? "Paiement en cours..." : "Terminer et payer"}
          </button>
          <button onClick={this.cancelSession} style={{ margin: '10px', padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      );
    } else {
      return (
        <div>
          <p>Prêt à commencer ? Sélectionnez une durée.</p>
        </div>
      );
    }
  }

  render() {
    const { backendURL, reader } = this.state;
    return (
      <div className={css`display: flex; align-items: center; justify-content: center; padding: 24px;`}>
        <Group direction="column" spacing={30}>
          <Group direction="row" spacing={30} responsive>
            <Group direction="column" spacing={16} responsive>
              {backendURL && (
                <ConnectionInfo
                  backendURL={backendURL}
                  reader={reader}
                  onSetBackendURL={this.onSetBackendURL}
                  onClickDisconnect={this.disconnectReader}
                />
              )}
              {this.renderForm()}
            </Group>
            <Logs />
          </Group>
        </Group>
      </div>
    );
  }
}

export default App;
