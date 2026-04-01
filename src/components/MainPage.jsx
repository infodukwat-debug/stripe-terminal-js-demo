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

// Liste des produits (durées)
const products = [
  { id: 1, name: '1 min', price: 100, image: '🕐' },   // 1,00 €
  { id: 2, name: '5 mins', price: 500, image: '🕔' },  // 5,00 €
  { id: 3, name: '15 mins', price: 1200, image: '🕒' }, // 12,00 €
  { id: 4, name: '30 mins', price: 2000, image: '🕡' }, // 20,00 €
];

// Prix de la minute supplémentaire (en centimes)
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
      chargeAmount: 100,          // 1€ par défaut
      itemDescription: "Test produit",
      taxAmount: 0,
      currency: "eur",
      workFlowInProgress: null,
      discoveryWasCancelled: false,
      refundedChargeID: null,
      refundedAmount: null,
      cancelableRefund: false,
      usingSimulator: false,
      testCardNumber: "",
      testPaymentMethod: "visa",
      tipAmount: null,
      simulateOnReaderTip: false,
      // Nouveaux champs pour la sélection de produits et la gestion de session
      selectedProduct: null,
      showProductSelection: true,
      // Session de paiement
      pendingPaymentIntentId: null,   // ID du PaymentIntent en attente de capture
      sessionStartTime: null,          // timestamp de début de session
      waitingForExit: false,           // état : préautorisation faite, utilisateur dans la cabine
    };
    this.timerInterval = null;
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  isWorkflowDisabled = () =>
    this.state.cancelablePayment || this.state.workFlowInProgress;

  runWorkflow = async (workflowName, workflowFn) => {
    console.log(workflowName, workflowFn);
    this.setState({ workFlowInProgress: workflowName });
    try {
      await workflowFn();
    } finally {
      this.setState({ workFlowInProgress: null });
    }
  };

  // 1. Stripe Terminal Initialization
  initializeBackendClientAndTerminal(url) {
    this.client = new Client(url);
    this.terminal = window.StripeTerminal.create({
      onFetchConnectionToken: async () => {
        let connectionTokenResult = await this.client.createConnectionToken();
        return connectionTokenResult.secret;
      },
      onUnexpectedReaderDisconnect: Logger.tracedFn(
        "onUnexpectedReaderDisconnect",
        "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-create",
        () => {
          alert("Unexpected disconnect from the reader");
          this.setState({
            connectionStatus: "not_connected",
            reader: null,
            waitingForExit: false,
            pendingPaymentIntentId: null,
            sessionStartTime: null,
          });
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
    // ... (les watchObject restent identiques)
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

  // 2. Discover and connect to a reader.
  discoverReaders = async () => {
    this.setState({ discoveryWasCancelled: false });
    const discoverResult = await this.terminal.discoverReaders();
    if (discoverResult.error) {
      console.log("Failed to discover: ", discoverResult.error);
      return discoverResult.error;
    } else {
      if (this.state.discoveryWasCancelled) return;
      this.setState({
        discoveredReaders: discoverResult.discoveredReaders
      });
      return discoverResult.discoveredReaders;
    }
  };

  cancelDiscoverReaders = () => {
    this.setState({ discoveryWasCancelled: true });
  };

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
    this.setState({ reader: null, waitingForExit: false, pendingPaymentIntentId: null, sessionStartTime: null });
    if (this.timerInterval) clearInterval(this.timerInterval);
  };

  registerAndConnectNewReader = async (label, registrationCode, location) => {
    try {
      let reader = await this.client.registerDevice({ label, registrationCode, location });
      await this.connectToReader(reader);
      console.log("Registered and Connected Successfully!");
    } catch (e) {}
  };

  // 3. Terminal Workflows
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

  // Collecte du paiement avec préautorisation (sans capture immédiate)
  collectCardPayment = async () => {
    // Créer un PaymentIntent via le backend (avec capture_method: 'manual')
    if (!this.pendingPaymentIntentId) {
      try {
        let paymentMethodTypes = ["card_present"];
        if (this.state.currency === "cad") paymentMethodTypes.push("interac_present");
        let createIntentResponse = await this.client.createPaymentIntent({
          amount: this.state.chargeAmount + this.state.taxAmount,
          currency: this.state.currency,
          description: `Qnook - ${this.state.selectedProduct?.name}`,
          paymentMethodTypes
        });
        // Le backend doit renvoyer le client_secret
        this.pendingPaymentIntentSecret = createIntentResponse.secret;
      } catch (e) {
        console.error("Erreur création PaymentIntent:", e);
        return;
      }
    }

    const simulatorConfiguration = {
      testPaymentMethod: this.state.testPaymentMethod,
      testCardNumber: this.state.testCardNumber
    };
    if (this.state.simulateOnReaderTip) simulatorConfiguration.tipAmount = Number(this.state.tipAmount);

    this.terminal.setSimulatorConfiguration(simulatorConfiguration);
    const paymentMethodPromise = this.terminal.collectPaymentMethod(this.pendingPaymentIntentSecret);
    this.setState({ cancelablePayment: true });
    const result = await paymentMethodPromise;
    if (result.error) {
      console.log("Collect payment method failed:", result.error.message);
      this.setState({ cancelablePayment: false });
    } else {
      const confirmResult = await this.terminal.processPayment(result.paymentIntent);
      this.setState({ cancelablePayment: false });
      if (confirmResult.error) {
        alert(`Confirm failed: ${confirmResult.error.message}`);
      } else if (confirmResult.paymentIntent) {
        // On ne capture pas tout de suite ! On stocke l'ID et on démarre le timer.
        this.pendingPaymentIntentId = confirmResult.paymentIntent.id;
        const startTime = Date.now();
        this.setState({
          sessionStartTime: startTime,
          waitingForExit: true,
          showProductSelection: false,
          pendingPaymentIntentSecret: null,
        });
        // Démarrer un timer pour afficher le temps écoulé (optionnel)
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
          this.forceUpdate(); // pour rafraîchir l'affichage du temps
        }, 1000);
        console.log("Préautorisation réussie, session commencée à", new Date(startTime).toLocaleTimeString());
      }
    }
  };

  // Annuler le paiement en cours (si jamais)
  cancelPendingPayment = async () => {
    await this.terminal.cancelCollectPaymentMethod();
    this.pendingPaymentIntentSecret = null;
    this.setState({ cancelablePayment: false });
  };

  // Sauvegarder une carte pour réutilisation (non utilisé ici)
  saveCardForFutureUse = async () => {
    const readResult = await this.terminal.readReusableCard();
    if (readResult.error) {
      alert(`readReusableCard failed: ${readResult.error.message}`);
    } else {
      try {
        let customer = await this.client.savePaymentMethodToCustomer({
          paymentMethodId: readResult.payment_method.id
        });
        console.log("Payment method saved to customer!", customer);
        return customer;
      } catch (e) {}
    }
  };

  // Gestion de la fin de session : calcul du temps réel, du supplément, capture
  endSession = async () => {
  if (!this.pendingPaymentIntentId || !this.state.sessionStartTime) {
    alert("Aucune session en cours");
    return;
  }

  const elapsedMs = Date.now() - this.state.sessionStartTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const chosenMinutes = this.state.selectedProduct ? parseInt(this.state.selectedProduct.name.split(' ')[0]) : 0;
  let extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
  const extraAmount = extraMinutes * EXTRA_MINUTE_PRICE; // en centimes

  try {
    // Capture directe (sans mise à jour du montant)
    const captureResponse = await fetch(`${this.state.backendURL}/capture_payment_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: this.pendingPaymentIntentId })
    });
    const captureResult = await captureResponse.json();
    if (captureResponse.ok) {
      alert(`Session terminée. Temps réel : ${elapsedMinutes} min. Supplément : ${extraMinutes} min (${(extraAmount/100).toFixed(2)} €). Paiement capturé (montant initial).`);
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.setState({
        waitingForExit: false,
        pendingPaymentIntentId: null,
        sessionStartTime: null,
        showProductSelection: true,
        selectedProduct: null,
        chargeAmount: 100
      });
    } else {
      alert(`Erreur lors de la capture : ${captureResult.error || "inconnue"}`);
    }
  } catch (err) {
    console.error(err);
    alert(`Erreur : ${err.message}`);
  }
};

      // 2. Capturer le PaymentIntent
      const captureResponse = await fetch(`${this.state.backendURL}/capture_payment_intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: this.pendingPaymentIntentId })
      });
      const captureResult = await captureResponse.json();
      if (captureResponse.ok) {
        alert(`Session terminée. Temps réel : ${elapsedMinutes} min. Supplément : ${extraMinutes} min (${(extraAmount/100).toFixed(2)} €). Paiement capturé.`);
        // Réinitialiser l'état
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.setState({
          waitingForExit: false,
          pendingPaymentIntentId: null,
          sessionStartTime: null,
          showProductSelection: true,
          selectedProduct: null,
          chargeAmount: 100
        });
      } else {
        alert(`Erreur lors de la capture : ${captureResult.error || "inconnue"}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
    }
  };

  // Annuler la session (par exemple si problème)
  cancelSession = async () => {
    // Optionnel : annuler le PaymentIntent côté backend
    if (this.state.pendingPaymentIntentId) {
      // Appeler un endpoint /cancel_payment_intent si vous en avez un
      alert("Session annulée, le paiement n'a pas été capturé.");
    }
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.setState({
      waitingForExit: false,
      pendingPaymentIntentId: null,
      sessionStartTime: null,
      showProductSelection: true,
      selectedProduct: null,
      chargeAmount: 100
    });
  };

  // UI Methods
  onSetBackendURL = url => {
    if (url !== null) {
      window.localStorage.setItem("terminal.backendUrl", url);
    } else {
      window.localStorage.removeItem("terminal.backendUrl");
    }
    this.initializeBackendClientAndTerminal(url);
    this.setState({ backendURL: url });
  };

  selectProduct = (product) => {
    this.setState({
      selectedProduct: product,
      chargeAmount: product.price,
      taxAmount: 0,
      showProductSelection: false,
      itemDescription: product.name,
    });
  };

  updateChargeAmount = amount => {
    this.setState({ chargeAmount: parseInt(amount, 10) });
    this.pendingPaymentIntentSecret = null;
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
      waitingForExit,
      sessionStartTime,
    } = this.state;

    // Écran de sélection des produits
    if (showProductSelection && backendURL !== null && reader !== null && !waitingForExit) {
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
                  transition: '0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
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

    // Écran de sélection initiale (URL backend ou connexion lecteur)
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
    } else if (waitingForExit) {
      // Session en cours : afficher le temps écoulé et les boutons de fin
      const elapsedMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const chosenMinutes = selectedProduct ? parseInt(selectedProduct.name.split(' ')[0]) : 0;
      const extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
      return (
        <div style={{ textAlign: 'center' }}>
          <h2>Session en cours</h2>
          <p>Produit : {selectedProduct?.name} ({(selectedProduct?.price/100).toFixed(2)} €)</p>
          <p>Temps écoulé : {elapsedMinutes} min</p>
          {extraMinutes > 0 && <p>Minutes supplémentaires : {extraMinutes} min ({(extraMinutes * EXTRA_MINUTE_PRICE/100).toFixed(2)} €)</p>}
          <button onClick={this.endSession} style={{ margin: '10px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Terminer et payer
          </button>
          <button onClick={this.cancelSession} style={{ margin: '10px', padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      );
    } else {
      // Écran avec produit sélectionné (avant paiement)
      return (
        <>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            {selectedProduct && (
              <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
                <strong>Produit sélectionné :</strong> {selectedProduct.name} - {(selectedProduct.price / 100).toFixed(2)} €
                <button 
                  onClick={() => this.setState({ showProductSelection: true, selectedProduct: null })}
                  style={{ marginLeft: '15px', padding: '5px 10px', cursor: 'pointer' }}
                >
                  Changer
                </button>
              </div>
            )}
          </div>
          <CommonWorkflows
            workFlowDisabled={this.isWorkflowDisabled()}
            onClickCollectCardPayments={() =>
              this.runWorkflow("collectPayment", this.collectCardPayment)
            }
            onClickSaveCardForFutureUse={() =>
              this.runWorkflow("saveCard", this.saveCardForFutureUse)
            }
            onClickCancelPayment={this.cancelPendingPayment}
            onChangeTestPaymentMethod={this.onChangeTestPaymentMethod}
            onChangeTestCardNumber={this.onChangeTestCardNumber}
            onChangeTipAmount={this.onChangeTipAmount}
            onChangeSimulateOnReaderTip={this.onChangeSimulateOnReaderTip}
            cancelablePayment={cancelablePayment}
            usingSimulator={usingSimulator}
          />
          <RefundForm
            onClickProcessRefund={() =>
              this.runWorkflow("collectRefund", this.collectRefundPaymentMethod)
            }
            chargeID={this.state.refundedChargeID}
            onChangeChargeID={id => this.updateRefundChargeID(id)}
            refundAmount={this.state.refundedAmount}
            onChangeRefundAmount={amt => this.updateRefundAmount(amt)}
            cancelableRefund={this.state.cancelableRefund}
            onClickCancelRefund={() =>
              this.runWorkflow("cancelRefund", this.cancelPendingRefund)
            }
          />
          <CartForm
            workFlowDisabled={this.isWorkflowDisabled()}
            onClickUpdateLineItems={() =>
              this.runWorkflow("updateLineItems", this.updateLineItems)
            }
            itemDescription={this.state.itemDescription}
            chargeAmount={this.state.chargeAmount}
            taxAmount={this.state.taxAmount}
            currency={this.state.currency}
            onChangeCurrency={currency => this.updateCurrency(currency)}
            onChangeChargeAmount={amount => this.updateChargeAmount(amount)}
            onChangeTaxAmount={amount => this.updateTaxAmount(amount)}
            onChangeItemDescription={description =>
              this.updateItemDescription(description)
            }
          />
        </>
      );
    }
  }

  // Méthodes de remboursement (inchangées)
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

  render() {
    const { backendURL, reader } = this.state;
    return (
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          @media (max-width: 800px) {
            height: auto;
            padding: 24px;
          }
        `}
      >
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
