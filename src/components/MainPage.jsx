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

// Liste des produits
const products = [
  { id: 1, name: '1 min', price: 100, image: '🕐' },
  { id: 2, name: '5 mins', price: 500, image: '🕔' },
  { id: 3, name: '15 mins', price: 1200, image: '🕒' },
  { id: 4, name: '30 mins', price: 2000, image: '🕡' },
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
      chargeAmount: 100,          // par défaut 1€
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
      // Nouveaux champs pour la sélection de produits
      selectedProduct: null,
      showProductSelection: true,
    };
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
            reader: null
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
    Logger.watchObject(this.client, "backend", {
      createConnectionToken: {
        docsUrl: "https://stripe.com/docs/terminal/sdk/js#connection-token"
      },
      registerDevice: {
        docsUrl:
          "https://stripe.com/docs/terminal/readers/connecting/verifone-p400#register-reader"
      },
      createPaymentIntent: {
        docsUrl: "https://stripe.com/docs/terminal/payments#create"
      },
      capturePaymentIntent: {
        docsUrl: "https://stripe.com/docs/terminal/payments#capture"
      },
      savePaymentMethodToCustomer: {
        docsUrl: "https://stripe.com/docs/terminal/payments/saving-cards"
      }
    });
    Logger.watchObject(this.terminal, "terminal", {
      discoverReaders: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#discover-readers"
      },
      connectReader: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#connect-reader"
      },
      disconnectReader: {
        docsUrl: "https://stripe.com/docs/terminal/js-api-reference#disconnect"
      },
      setReaderDisplay: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#set-reader-display"
      },
      collectPaymentMethod: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#collect-payment-method"
      },
      cancelCollectPaymentMethod: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#cancel-collect-payment-method"
      },
      processPayment: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#process-payment"
      },
      readReusableCard: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#read-reusable-card"
      },
      cancelReadReusableCard: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#cancel-read-reusable-card"
      },
      collectRefundPaymentMethod: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-collectrefundpaymentmethod"
      },
      processRefund: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-processrefund"
      },
      cancelCollectRefundPaymentMethod: {
        docsUrl:
          "https://stripe.com/docs/terminal/js-api-reference#stripeterminal-cancelcollectrefundpaymentmethod"
      }
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
    this.setState({ reader: null });
  };

  registerAndConnectNewReader = async (label, registrationCode, location) => {
    try {
      let reader = await this.client.registerDevice({
        label,
        registrationCode,
        location
      });
      await this.connectToReader(reader);
      console.log("Registered and Connected Successfully!");
    } catch (e) {
      // Suppress backend errors since they will be shown in logs
    }
  };

  // 3. Terminal Workflows (Once connected to a reader)
  updateLineItems = async () => {
    await this.terminal.setReaderDisplay({
      type: "cart",
      cart: {
        line_items: [
          {
            description: this.state.itemDescription,
            amount: this.state.chargeAmount,
            quantity: 1
          }
        ],
        tax: this.state.taxAmount,
        total: this.state.chargeAmount + this.state.taxAmount,
        currency: this.state.currency
      }
    });
    console.log("Reader Display Updated!");
    return;
  };

  // 3b. Collect a card present payment
  collectCardPayment = async () => {
    if (!this.pendingPaymentIntentSecret) {
      try {
        let paymentMethodTypes = ["card_present"];
        if (this.state.currency === "cad") {
          paymentMethodTypes.push("interac_present");
        }
        let createIntentResponse = await this.client.createPaymentIntent({
          amount: this.state.chargeAmount + this.state.taxAmount,
          currency: this.state.currency,
          description: "Test Charge",
          paymentMethodTypes
        });
        this.pendingPaymentIntentSecret = createIntentResponse.secret;
      } catch (e) {
        return;
      }
    }

    const simulatorConfiguration = {
      testPaymentMethod: this.state.testPaymentMethod,
      testCardNumber: this.state.testCardNumber
    };

    if (this.state.simulateOnReaderTip) {
      simulatorConfiguration.tipAmount = Number(this.state.tipAmount);
    }

    this.terminal.setSimulatorConfiguration(simulatorConfiguration);
    const paymentMethodPromise = this.terminal.collectPaymentMethod(
      this.pendingPaymentIntentSecret
    );
    this.setState({ cancelablePayment: true });
    const result = await paymentMethodPromise;
    if (result.error) {
      console.log("Collect payment method failed:", result.error.message);
    } else {
      const confirmResult = await this.terminal.processPayment(
        result.paymentIntent
      );
      this.setState({ cancelablePayment: false });
      if (confirmResult.error) {
        alert(`Confirm failed: ${confirmResult.error.message}`);
      } else if (confirmResult.paymentIntent) {
        if (confirmResult.paymentIntent.status !== "succeeded") {
          try {
            let captureResult = await this.client.capturePaymentIntent({
              paymentIntentId: confirmResult.paymentIntent.id
            });
            this.pendingPaymentIntentSecret = null;
            console.log("Payment Successful!");
            // === ALERTE DISTRIBUTION ===
            alert(`✅ Distribution de ${this.state.selectedProduct?.name} en cours...`);
            // Retour à la sélection des produits
            this.setState({ showProductSelection: true, selectedProduct: null });
            return captureResult;
          } catch (e) {
            return;
          }
        } else {
          this.pendingPaymentIntentSecret = null;
          console.log("Single-message payment successful!");
          // === ALERTE DISTRIBUTION ===
          alert(`✅ Distribution de ${this.state.selectedProduct?.name} en cours...`);
          this.setState({ showProductSelection: true, selectedProduct: null });
          return confirmResult;
        }
      }
    }
  };

  // 3c. Cancel a pending payment.
  cancelPendingPayment = async () => {
    await this.terminal.cancelCollectPaymentMethod();
    this.pendingPaymentIntentSecret = null;
    this.setState({ cancelablePayment: false });
  };

  // 3d. Save a card for re-use online.
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
      } catch (e) {
        return;
      }
    }
  };

  // 3e. collectRefundPaymentMethod
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

  // 3f. cancelCollectRefundPaymentMethod
  cancelPendingRefund = async () => {
    await this.terminal.cancelCollectRefundPaymentMethod();
    this.setState({
      cancelableRefund: false,
      refundedAmount: null,
      refundedChargeID: null
    });
  };

  // 4. UI Methods
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
      itemDescription: product.name
    });
  };

  updateChargeAmount = amount => {
    this.setState({ chargeAmount: parseInt(amount, 10) });
    this.pendingPaymentIntentSecret = null;
  };
  updateItemDescription = description =>
    this.setState({ itemDescription: description });
  updateTaxAmount = amount =>
    this.setState({ taxAmount: parseInt(amount || 0, 10) });
  updateCurrency = currency => this.setState({ currency: currency });
  updateRefundChargeID = id => this.setState({ refundedChargeID: id });
  updateRefundAmount = amount => {
    this.setState({ refundedAmount: parseInt(amount, 10) });
  };

  onChangeTestPaymentMethod = testPaymentMethod => {
    this.setState({ testPaymentMethod });
  };

  onChangeTestCardNumber = testCardNumber => {
    this.setState({ testCardNumber });
  };

  onChangeTipAmount = (tipAmount) => {
    this.setState({ tipAmount });
  };

  onChangeSimulateOnReaderTip = (simulateOnReaderTip) => {
    this.setState({ simulateOnReaderTip });
  };

  renderForm() {
    const {
      backendURL,
      cancelablePayment,
      reader,
      discoveredReaders,
      usingSimulator,
      showProductSelection,
      selectedProduct,
    } = this.state;

    // Écran de sélection des produits (si backend et lecteur sont prêts)
    if (showProductSelection && backendURL !== null && reader !== null) {
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

    // Reste de la logique originale
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
    } else {
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
