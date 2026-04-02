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

const products = [
  { id: 1, name: '1 min', price: 100, image: '🕐' },
  { id: 2, name: '5 mins', price: 500, image: '🕔' },
  { id: 3, name: '15 mins', price: 1200, image: '🕒' },
  { id: 4, name: '30 mins', price: 2000, image: '🕡' },
];

const EXTRA_MINUTE_PRICE = 100; // 1,00 €

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
      // Nouveaux états pour le modèle "paiement à la sortie"
      selectedProduct: null,
      showProductSelection: true,
      sessionStartTime: null,
      sessionActive: false,
      paymentInProgress: false,
    };
    this.timerInterval = null;
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

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
    this.setState({ reader: null, sessionActive: false, sessionStartTime: null });
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

  // Démarrer la session (choix du produit)
  startSession = (product) => {
    const startTime = Date.now();
    this.setState({
      selectedProduct: product,
      chargeAmount: product.price,
      sessionStartTime: startTime,
      sessionActive: true,
      showProductSelection: false,
    });
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.forceUpdate(), 1000);
  };

  // Terminer la session : calculer le total, créer le PaymentIntent et encaisser
  endSession = async () => {
    if (this.state.paymentInProgress) return;
    if (!this.state.sessionStartTime || !this.state.selectedProduct) {
      alert("Aucune session en cours");
      return;
    }

    this.setState({ paymentInProgress: true });

    const elapsedMs = Date.now() - this.state.sessionStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const chosenMinutes = this.state.selectedProduct ? parseInt(this.state.selectedProduct.name.split(' ')[0]) : 0;
    let extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
    const extraAmount = extraMinutes * EXTRA_MINUTE_PRICE;

    const initialAmount = this.state.chargeAmount;
    const totalAmount = initialAmount + extraAmount;

    console.log("--- endSession ---");
    console.log("temps écoulé (min) :", elapsedMinutes);
    console.log("temps choisi (min) :", chosenMinutes);
    console.log("minutes supp. :", extraMinutes);
    console.log("montant initial (centimes) :", initialAmount);
    console.log("montant supplément (centimes) :", extraAmount);
    console.log("montant total (centimes) :", totalAmount);

    try {
      // 1. Créer un PaymentIntent avec le montant total (capture automatique)
      const createIntentResponse = await this.client.createPaymentIntent({
        amount: totalAmount,
        currency: this.state.currency,
        let extraText = extraMinutes > 0 ? ` + ${extraMinutes} min supp` : '';
description: `Qnook - ${this.state.selectedProduct.name}${extraText}`,
        paymentMethodTypes: ["card_present"]
      });
      const clientSecret = createIntentResponse.client_secret;

      // 2. Configurer le simulateur (ou lecteur réel)
      const simulatorConfiguration = {
        testPaymentMethod: this.state.testPaymentMethod,
        testCardNumber: this.state.testCardNumber
      };
      if (this.state.simulateOnReaderTip) simulatorConfiguration.tipAmount = Number(this.state.tipAmount);
      this.terminal.setSimulatorConfiguration(simulatorConfiguration);

      // 3. Collecter le moyen de paiement
      const collectResult = await this.terminal.collectPaymentMethod(clientSecret);
      if (collectResult.error) {
        throw new Error(`collectPaymentMethod failed: ${collectResult.error.message}`);
      }

      // 4. Traiter le paiement
      const confirmResult = await this.terminal.processPayment(collectResult.paymentIntent);
      if (confirmResult.error) {
        throw new Error(`processPayment failed: ${confirmResult.error.message}`);
      }

      // 5. Succès
      alert(`Paiement réussi !\nTemps réel : ${elapsedMinutes} min\nSupplément : ${extraMinutes} min (${(extraAmount/100).toFixed(2)} €)\nTotal : ${(totalAmount/100).toFixed(2)} €`);
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.setState({
        sessionActive: false,
        sessionStartTime: null,
        showProductSelection: true,
        selectedProduct: null,
        chargeAmount: 100,
        paymentInProgress: false,
      });
    } catch (err) {
      console.error("Erreur endSession:", err);
      alert(`Erreur : ${err.message}`);
      this.setState({ paymentInProgress: false });
    }
  };

  // Annuler la session
  cancelSession = () => {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.setState({
      sessionActive: false,
      sessionStartTime: null,
      showProductSelection: true,
      selectedProduct: null,
      chargeAmount: 100,
      paymentInProgress: false,
    });
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
    this.setState({ backendURL: url });
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
    } = this.state;

    // Écran de sélection des produits
    if (showProductSelection && backendURL !== null && reader !== null && !sessionActive) {
      return (
        <div>
          <h2 style={{ textAlign: 'center' }}>Choisissez votre durée</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => this.startSession(product)}
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
                <div style={{ fontSize: '3rem' }}>{product.image}</div>
                <div>{product.name}</div>
                <div>{(product.price / 100).toFixed(2)} €</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Connexion initiale (backend URL)
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
      // Session en cours : afficher le timer et les boutons
      const elapsedMs = this.state.sessionStartTime ? Date.now() - this.state.sessionStartTime : 0;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const chosenMinutes = selectedProduct ? parseInt(selectedProduct.name.split(' ')[0]) : 0;
      const extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
      return (
        <div style={{ textAlign: 'center' }}>
          <h2>Session en cours</h2>
          <p>Produit : {selectedProduct?.name} ({(selectedProduct?.price/100).toFixed(2)} €)</p>
          <p>Temps écoulé : {elapsedMinutes} min</p>
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
      // Écran après sélection mais avant démarrage (normalement pas utilisé)
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
