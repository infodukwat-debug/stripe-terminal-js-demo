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

const EXTRA_MINUTE_PRICE = 100; // 1,00 € par minute supplémentaire
const INCREMENT_STEP_CENTS = 500;   // palier de 5€
const MAX_INCREMENT_ATTEMPTS = 10;

const testCards = [
  { name: "Visa (succès)", number: "4242424242424242", type: "visa" },
  { name: "Refus - fonds insuffisants", number: "4000000000009995", type: "charge_declined_insufficient_funds" },
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
    };
    this.timerInterval = null;
    this.startTime = null; // timestamp de début de session (en ms)
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
      onFetchConnectionToken: async () => (await this.client.createConnectionToken()).secret,
      onUnexpectedReaderDisconnect: Logger.tracedFn("onUnexpectedReaderDisconnect", "...", () => {
        alert("Unexpected disconnect from the reader");
        this.setState({ connectionStatus: "not_connected", reader: null });
      }),
      onConnectionStatusChange: Logger.tracedFn("onConnectionStatusChange", "...", ev => this.setState({ connectionStatus: ev.status, reader: null }))
    });
    Logger.watchObject(this.client, "backend", { createConnectionToken: {}, registerDevice: {}, createPaymentIntent: {}, capturePaymentIntent: {}, savePaymentMethodToCustomer: {} });
    Logger.watchObject(this.terminal, "terminal", { discoverReaders: {}, connectReader: {}, disconnectReader: {}, setReaderDisplay: {}, collectPaymentMethod: {}, cancelCollectPaymentMethod: {}, processPayment: {}, readReusableCard: {}, cancelReadReusableCard: {}, collectRefundPaymentMethod: {}, processRefund: {}, cancelCollectRefundPaymentMethod: {} });
  }

  discoverReaders = async () => {
    this.setState({ discoveryWasCancelled: false });
    const discoverResult = await this.terminal.discoverReaders();
    if (discoverResult.error) return discoverResult.error;
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
    if (!connectResult.error) this.setState({ usingSimulator: selectedReader.id === "SIMULATOR", status: "workflows", discoveredReaders: [], reader: connectResult.reader });
    return connectResult;
  };
  disconnectReader = async () => {
    await this.terminal.disconnectReader();
    this.setState({ reader: null, sessionActive: false });
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.startTime = null;
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
      cart: { line_items: [{ description: this.state.itemDescription, amount: this.state.chargeAmount, quantity: 1 }], tax: this.state.taxAmount, total: this.state.chargeAmount + this.state.taxAmount, currency: this.state.currency }
    });
  };

  computeAuthorizationAmount(priceInCents, durationMinutes) {
    return durationMinutes < 30 ? priceInCents * 2 : Math.ceil(priceInCents * 1.5);
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
    const tempProduct = { ...originalProduct, name: `${newDuration} min`, price: Math.ceil(newPrice) };
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
        amount: authAmount, currency, description: `Pré-autorisation Qnook - ${selectedProduct.name}`,
        paymentMethodTypes: ["card_present"], email: wantReceipt ? customerEmail : undefined
      });
      const clientSecret = createIntentResponse.client_secret;
      const simulatorConfiguration = { testPaymentMethod: selectedTestCard.type, testCardNumber: selectedTestCard.number };
      if (this.state.simulateOnReaderTip) simulatorConfiguration.tipAmount = Number(this.state.tipAmount);
      this.terminal.setSimulatorConfiguration(simulatorConfiguration);
      const collectResult = await this.terminal.collectPaymentMethod(clientSecret);
      if (collectResult.error) throw new Error(collectResult.error.message);
      const confirmResult = await this.terminal.processPayment(collectResult.paymentIntent);
      if (confirmResult.error) {
        if (confirmResult.error.code === 'insufficient_funds' || confirmResult.error.message.includes('insufficient_funds')) {
          this.handleInsufficientFunds(chosenMinutes, selectedProduct);
        } else alert(`Erreur de paiement : ${confirmResult.error.message}`);
        return;
      }
      this.pendingPaymentIntentId = confirmResult.paymentIntent.id;
      this.currentAuthorizedAmount = authAmount;
      this.pricePerMinute = pricePerMinute;
      this.startTime = Date.now();
      this.setState({ sessionActive: true, showEmailForm: false, paymentInProgress: false });
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => this.forceUpdate(), 1000);
      console.log(`Pré-autorisation réussie, autorisé ${authAmount} centimes`);
    } catch (err) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
      this.setState({ paymentInProgress: false });
    }
  };

  selectProduct = (product) => {
    this.setState({
      selectedProduct: product, chargeAmount: product.price, showProductSelection: false, showEmailForm: true,
      wantReceipt: false, wantReminder: false, customerEmail: "", emailSubmitted: false, reminderSent: false
    });
  };
  handleWantReceiptChange = (e) => this.setState({ wantReceipt: e.target.checked });
  handleWantReminderChange = (e) => this.setState({ wantReminder: e.target.checked });
  handleEmailChange = (e) => this.setState({ customerEmail: e.target.value });
  handleTestCardChange = (e) => {
    const card = testCards.find(c => c.number === e.target.value);
    if (card) this.setState({ selectedTestCard: card });
  };
  submitEmailForm = () => {
    const { wantReceipt, wantReminder, customerEmail } = this.state;
    if ((wantReceipt || wantReminder) && !customerEmail) { alert("Veuillez saisir une adresse email."); return; }
    this.setState({ emailSubmitted: true, reminderSent: false });
    this.startPaymentAuthorization();
  };
  cancelEmailForm = () => this.setState({ showProductSelection: true, selectedProduct: null, showEmailForm: false });

  checkReminderAndUpdate = () => {
    const { selectedProduct, wantReminder, reminderSent, customerEmail, backendURL } = this.state;
    if (!this.startTime || !selectedProduct) return;
    const elapsedMs = Date.now() - this.startTime;
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
      await fetch(`${backendURL}/send-reminder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: customerEmail, productName: selectedProduct.name, durationChosen: chosenMinutes }) });
      console.log("Rappel envoyé");
    } catch (err) { console.error("Erreur envoi rappel:", err); }
  };

  endSession = async () => {
    if (this.state.paymentInProgress) return;
    if (!this.startTime || !this.state.selectedProduct || !this.pendingPaymentIntentId) {
      alert("Aucune session en cours");
      return;
    }

    this.setState({ paymentInProgress: true });

    const elapsedMs = Date.now() - this.startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const chosenMinutes = parseInt(this.state.selectedProduct.name.split(' ')[0]);
    let extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
    const extraAmount = extraMinutes * EXTRA_MINUTE_PRICE;
    const totalDue = this.state.selectedProduct.price + extraAmount;

    console.log(`[endSession] elapsedMs=${elapsedMs}, elapsedMinutes=${elapsedMinutes}, chosenMinutes=${chosenMinutes}, extraMinutes=${extraMinutes}, totalDue=${totalDue}`);

    let currentAuthorized = this.currentAuthorizedAmount;
    let attempts = 0;
    while (currentAuthorized < totalDue && attempts < MAX_INCREMENT_ATTEMPTS) {
      const nextAmount = Math.min(totalDue, currentAuthorized + INCREMENT_STEP_CENTS);
      try {
        const response = await fetch(`${this.state.backendURL}/increment-authorization`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: this.pendingPaymentIntentId, newAmount: nextAmount })
        });
        if (!response.ok) throw new Error((await response.json()).error);
        currentAuthorized = nextAmount;
        console.log(`Incrémentation réussie à ${nextAmount} centimes`);
      } catch (err) {
        console.error(`Incrémentation refusée à ${nextAmount} centimes :`, err);
        break;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const finalAmount = currentAuthorized;
    const capturedMinutes = Math.floor(finalAmount / this.pricePerMinute);
    const capturedExtra = Math.max(0, capturedMinutes - chosenMinutes);

    let description = `Qnook - ${chosenMinutes} min`;
    if (capturedExtra > 0) description += ` + ${capturedExtra} min supplémentaire(s)`;
    description += ` - ${(finalAmount/100).toFixed(2)}€`;

    try {
      try {
        await fetch(`${this.state.backendURL}/update-payment-intent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: this.pendingPaymentIntentId, description })
        });
        console.log("Description mise à jour pour le reçu");
      } catch (descErr) { console.warn("Impossible de mettre à jour la description (non bloquant)"); }

      const captureResponse = await fetch(`${this.state.backendURL}/capture-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: this.pendingPaymentIntentId })
      });
      if (!captureResponse.ok) throw new Error((await captureResponse.json()).error);

      let msg = `✅ Paiement réussi !\n📆 Temps choisi : ${chosenMinutes} min (${(this.state.selectedProduct.price/100).toFixed(2)} €)\n`;
      if (capturedExtra > 0) msg += `➕ Supplément facturé : ${capturedExtra} min (${(capturedExtra * this.pricePerMinute / 100).toFixed(2)} €)\n`;
      if (extraMinutes > capturedExtra) msg += `⚠️ Temps supplémentaire non facturé : ${extraMinutes - capturedExtra} min (limite carte atteinte).\n`;
      msg += `💰 Total facturé : ${(finalAmount/100).toFixed(2)} €`;
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
      sessionActive: false, showProductSelection: true, selectedProduct: null,
      chargeAmount: 100, paymentInProgress: false, showEmailForm: false, emailSubmitted: false,
      reminderSent: false, pendingPaymentIntentId: null, currentAuthorizedAmount: 0, pricePerMinute: 0
    });
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.startTime = null;
  };

  cancelSession = () => this.resetSession();

  collectRefundPaymentMethod = async () => { /* inchangé */ };
  cancelPendingRefund = async () => { /* inchangé */ };
  onSetBackendURL = url => {
    if (url !== null) window.localStorage.setItem("terminal.backendUrl", url);
    else window.localStorage.removeItem("terminal.backendUrl");
    this.initializeBackendClientAndTerminal(url);
    this.setState({ backendURL: url }, () => this.loadProducts());
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
      return <span><span style={{ textDecoration: 'line-through', fontSize: '0.8rem' }}>{(product.price / 100).toFixed(2)} €</span> <span style={{ color: 'red', fontWeight: 'bold' }}>{(finalPrice / 100).toFixed(2)} €</span></span>;
    } else if (product.promo && product.promo.type === "fixed") {
      const finalPrice = Math.max(0, product.price - product.promo.value);
      return <span><span style={{ textDecoration: 'line-through', fontSize: '0.8rem' }}>{(product.price / 100).toFixed(2)} €</span> <span style={{ color: 'red', fontWeight: 'bold' }}>{(finalPrice / 100).toFixed(2)} €</span></span>;
    }
    return <span>{(product.price / 100).toFixed(2)} €</span>;
  }

  renderForm() {
    const { backendURL, cancelablePayment, reader, discoveredReaders, usingSimulator, showProductSelection,
            selectedProduct, sessionActive, paymentInProgress, showEmailForm, wantReceipt, wantReminder,
            customerEmail, emailSubmitted, products, selectedTestCard } = this.state;

    if (showProductSelection && backendURL && reader && !sessionActive && !showEmailForm) {
      if (products.length === 0) return <div>Chargement des produits...</div>;
      return (<div><h2 style={{ textAlign: 'center' }}>Choisissez votre durée</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {products.map(product => (<button key={product.id} onClick={() => this.selectProduct(product)} style={{ width: '150px', padding: '20px', fontSize: '1.2rem', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>{product.image || '🕐'}</div><div>{product.name}</div><div>{this.renderPrice(product)}</div>
        </button>))}
      </div></div>);
    }

    if (showEmailForm && !emailSubmitted) {
      return (<div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
        <h2>Options de la session</h2><p>Vous avez choisi : <strong>{selectedProduct?.name} ({this.renderPrice(selectedProduct)})</strong></p>
        <p><strong>Information :</strong> Une pré-autorisation majorée sera effectuée. Seul le temps réel sera débité.</p>
        <div style={{ marginBottom: '10px' }}><label><input type="checkbox" checked={wantReceipt} onChange={this.handleWantReceiptChange} /> Recevoir le reçu final par email</label></div>
        {selectedProduct && parseInt(selectedProduct.name.split(' ')[0]) > 5 && (<div style={{ marginBottom: '10px' }}><label><input type="checkbox" checked={wantReminder} onChange={this.handleWantReminderChange} /> Recevoir un rappel 5 minutes avant la fin</label></div>)}
        {(wantReceipt || wantReminder) && (<div style={{ marginBottom: '10px' }}><label>Adresse email :</label><input type="email" value={customerEmail} onChange={this.handleEmailChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>)}
        <div style={{ marginBottom: '10px' }}><label>Carte de test :</label><select value={selectedTestCard.number} onChange={this.handleTestCardChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>{testCards.map(card => <option key={card.number} value={card.number}>{card.name}</option>)}</select>
          <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#555' }}>Numéro: <strong>{selectedTestCard.number}</strong></div></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button onClick={this.submitEmailForm} disabled={paymentInProgress} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{paymentInProgress ? "Pré-autorisation en cours..." : "Démarrer la session"}</button>
          <button onClick={this.cancelEmailForm} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Annuler</button>
        </div>
      </div>);
    }

    if (!backendURL && !reader) return <BackendURLForm onSetBackendURL={this.onSetBackendURL} />;
    if (!reader) return <Readers onClickDiscover={() => this.discoverReaders()} onClickCancelDiscover={() => this.cancelDiscoverReaders()} onSubmitRegister={this.registerAndConnectNewReader} readers={discoveredReaders} onConnectToReader={this.connectToReader} handleUseSimulator={this.connectToSimulator} listLocations={this.client.listLocations} />;

    if (sessionActive && this.startTime) {
      const elapsedMs = Date.now() - this.startTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const elapsedMinutes = Math.floor(totalSeconds / 60);
      const elapsedSeconds = totalSeconds % 60;
      const chosenMinutes = selectedProduct ? parseInt(selectedProduct.name.split(' ')[0]) : 0;
      const extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
      return (<div style={{ textAlign: 'center' }}><h2>Session en cours</h2>
        <p>Produit : {selectedProduct?.name} ({this.renderPrice(selectedProduct)})</p>
        <p>Temps écoulé : {elapsedMinutes} min {elapsedSeconds.toString().padStart(2, '0')} s</p>
        {extraMinutes > 0 && <p>Supplément : {extraMinutes} min ({(extraMinutes * EXTRA_MINUTE_PRICE/100).toFixed(2)} €)</p>}
        <button onClick={this.endSession} disabled={paymentInProgress} style={{ margin: '10px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{paymentInProgress ? "Paiement en cours..." : "Terminer et payer"}</button>
        <button onClick={this.cancelSession} style={{ margin: '10px', padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Annuler</button>
      </div>);
    }
    return <div>Prêt à commencer ? Sélectionnez une durée.</div>;
  }

  render() {
    const { backendURL, reader } = this.state;
    return (<div className={css`display: flex; align-items: center; justify-content: center; padding: 24px;`}>
      <Group direction="column" spacing={30}><Group direction="row" spacing={30} responsive><Group direction="column" spacing={16} responsive>
        {backendURL && <ConnectionInfo backendURL={backendURL} reader={reader} onSetBackendURL={this.onSetBackendURL} onClickDisconnect={this.disconnectReader} />}
        {this.renderForm()}
      </Group><Logs /></Group></Group>
    </div>);
  }
}

export default App;
