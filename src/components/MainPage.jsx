import React, { Component } from 'react';
import { css } from 'emotion';
import { StripeTerminal } from '@stripe/terminal-js';
import Spinner from './Spinner';

const EXTRA_MINUTE_PRICE = 25; // 0.25€ en cents

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      backendURL: DEFAULT_BACKEND_URL,
      isInitializing: false,
      isInitialized: false,
      isConnecting: false,
      isDisconnecting: false,
      isCollectingPaymentMethod: false,
      isProcessingPayment: false,
      isConfirmingSetupIntent: false,
      isReadyForPayment: false,
      isProcessingTestClock: false,
      statusText: '',
      reader: null,
      errorText: '',
      collectedData: null,
      processPaymentError: null,
      confirmSetupIntentError: null,
      listReadersError: null,
      updatePaymentIntentError: null,
      connectedReaderStatus: '',
      selectedTestCard: null,
      products: [],
      selectedProduct: null,
      showProductSelection: true,
      showWelcomeScreen: true,
      sessionActive: false,
      sessionStartTime: null,
      paymentInProgress: false,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: '',
      pendingPaymentIntentId: null,
      reminderMinutes: 0,
      inactivityTimer: null,
      inactivityTimer1: null,
      inactivityTimer2: null,
      sessionPolling: null,
      timerInterval: null,
    };
  }

  componentDidMount() {
    this.initializeBackendClientAndTerminal(DEFAULT_BACKEND_URL);
    this.loadProducts();
    this.autoConnectSimulator();
    this.resetInactivityTimers();

    // Polling toutes les secondes pour vérifier si la session est encore active
    this.sessionPolling = setInterval(() => {
      // Vérifier qu'une session est active
      if (!this.state.sessionActive) return;
      if (this.state.paymentInProgress) return;
      
      fetch('http://localhost:5000/is-session-active')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!data.active) {
            console.log("🔔 Fin de session détectée par les capteurs !");
            this.endSession();
          }
        })
        .catch(err => console.error("[Polling] Erreur:", err));
    }, 1000);
  }

  componentWillUnmount() {
    if (this.state.timerInterval) clearInterval(this.state.timerInterval);
    this.clearInactivityTimers();
    if (this.sessionPolling) clearInterval(this.sessionPolling);
  }

  // ========== GESTION INACTIVITÉ ==========
  resetInactivityTimers = () => {
    if (this.state.sessionActive || this.state.paymentInProgress) return;

    // Timers pour la détection d'inactivité
    const resetTimer = () => {
      if (this.state.inactivityTimer) clearTimeout(this.state.inactivityTimer);
      if (this.state.inactivityTimer1) clearTimeout(this.state.inactivityTimer1);
      if (this.state.inactivityTimer2) clearTimeout(this.state.inactivityTimer2);

      const timer = setTimeout(() => {
        console.log("⏱ 5 minutes d'inactivité détectées !");
      }, 300000); // 5 minutes

      const timer1 = setTimeout(() => {
        console.log("⏱ 10 minutes d'inactivité détectées !");
      }, 600000); // 10 minutes

      const timer2 = setTimeout(() => {
        console.log("⏱ 20 minutes d'inactivité détectées ! Retour écran d'accueil");
        this.resetSession();
      }, 1200000); // 20 minutes

      this.setState({
        inactivityTimer: timer,
        inactivityTimer1: timer1,
        inactivityTimer2: timer2,
      });
    };

    // Ajouter des event listeners pour reset les timers à chaque interaction
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();
  };

  clearInactivityTimers = () => {
    if (this.state.inactivityTimer) clearTimeout(this.state.inactivityTimer);
    if (this.state.inactivityTimer1) clearTimeout(this.state.inactivityTimer1);
    if (this.state.inactivityTimer2) clearTimeout(this.state.inactivityTimer2);

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, () => {}, true);
    });
  };

  // ========== INITIALISATION ==========

  initializeBackendClientAndTerminal = async (backendURL) => {
    try {
      this.setState({
        isInitializing: true,
        statusText: 'Initializing...',
      });

      const response = await fetch(`${backendURL}/initialize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Save the backendURL for later use
      this.setState({
        backendURL: backendURL,
      });

      // Initialize StripeTerminal with the client secret
      await StripeTerminal.initialize({
        onFetcher: async (url, options) => {
          const resp = await fetch(`${backendURL}${url}`, options);

          if (!resp.ok) {
            return resp;
          }

          return resp;
        },
        onLogRequestResponseObject: true,
      });

      this.setState({
        isInitialized: true,
        statusText: '',
      });
    } catch (err) {
      this.setState({
        isInitializing: false,
        errorText: err.message,
        statusText: 'Initialization failed.',
      });
    }
  };

  // ========== READER DISCOVERY & CONNECTION ==========

  discoverReaders = async () => {
    this.setState({
      isConnecting: true,
      statusText: 'Discovering readers...',
    });

    try {
      const { discoveredReaders } = await StripeTerminal.discoverReaders({
        method: 'internet',
      });

      if (discoveredReaders.length === 0) {
        this.setState({
          errorText: 'No readers discovered.',
          statusText: '',
          isConnecting: false,
        });
      } else {
        // Automatically connect to the first discovered reader
        await this.connectReader(discoveredReaders[0]);
      }
    } catch (err) {
      this.setState({
        errorText: err.message,
        statusText: '',
        isConnecting: false,
      });
    }
  };

  connectReader = async (reader) => {
    this.setState({
      isConnecting: true,
      statusText: `Connecting to reader ${reader.label}...`,
      errorText: '',
      listReadersError: null,
    });

    try {
      const connectedReader = await StripeTerminal.connectReader(reader);
      this.setState({
        reader: connectedReader,
        connectedReaderStatus: connectedReader.status,
        isConnecting: false,
        statusText: '',
        showProductSelection: true,
        showWelcomeScreen: true,
      });
      if (this.state.timerInterval) clearInterval(this.state.timerInterval);
      this.setState({ timerInterval: setInterval(() => this.checkReminderAndUpdate(), 1000) });

      // Ouverture de la serrure (appel local)
      try {
        await fetch('http://localhost:5000/unlock', { method: 'POST' });
        console.log('✅ Serrure déverrouillée');
      } catch (err) {
        console.warn('Impossible de déverrouiller la serrure:', err);
      }
    } catch (err) {
      this.setState({
        errorText: err.message,
        statusText: '',
        isConnecting: false,
      });
    }
  };

  disconnectReader = async () => {
    await this.terminal.disconnectReader();
    this.setState({ reader: null, sessionActive: false, sessionStartTime: null, pendingPaymentIntentId: null });
    if (this.state.timerInterval) clearInterval(this.state.timerInterval);
    this.resetInactivityTimers();
  };

  // ========== PAYMENT METHODS ==========

  handleConfirmSetupIntent = async () => {
    const { reader } = this.state;

    if (!reader) {
      this.setState({
        errorText: 'Reader is not connected.',
      });
      return;
    }

    this.setState({
      isConfirmingSetupIntent: true,
      statusText: 'Confirming setup intent...',
      errorText: '',
      confirmSetupIntentError: null,
    });

    try {
      const { setupIntent, error } = await StripeTerminal.confirmSetupIntent(
        reader
      );

      if (error) {
        this.setState({
          confirmSetupIntentError: error.message,
          statusText: '',
          isConfirmingSetupIntent: false,
        });
      } else {
        this.setState({
          confirmSetupIntentError: null,
          collectedData: setupIntent,
          statusText: '',
          isConfirmingSetupIntent: false,
        });
      }
    } catch (err) {
      this.setState({
        confirmSetupIntentError: err.message,
        statusText: '',
        isConfirmingSetupIntent: false,
      });
    }
  };

  collectPaymentMethod = async () => {
    const { reader } = this.state;

    if (!reader) {
      this.setState({
        errorText: 'Reader is not connected.',
      });
      return;
    }

    this.setState({
      isCollectingPaymentMethod: true,
      statusText: 'Waiting for payment method...',
      errorText: '',
      processPaymentError: null,
    });

    try {
      const paymentIntent = await StripeTerminal.collectPaymentMethod(reader);
      console.log('Payment method collected:', paymentIntent);

      // Process Payment
      await this.processPaymentMethod(paymentIntent);
    } catch (err) {
      this.setState({
        processPaymentError: err.message,
        statusText: '',
        isCollectingPaymentMethod: false,
      });
    }
  };

  processPaymentMethod = async (paymentIntent) => {
    const { backendURL } = this.state;

    this.setState({
      isProcessingPayment: true,
      statusText: 'Processing payment...',
      errorText: '',
      processPaymentError: null,
    });

    try {
      const response = await fetch(`${backendURL}/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntent.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Payment processed:', data);

      if (data.success) {
        this.setState({
          collectedData: data,
          statusText: '',
          isProcessingPayment: false,
          isCollectingPaymentMethod: false,
        });
      } else {
        this.setState({
          processPaymentError: data.error || 'Payment processing failed',
          statusText: '',
          isProcessingPayment: false,
          isCollectingPaymentMethod: false,
        });
      }
    } catch (err) {
      this.setState({
        processPaymentError: err.message,
        statusText: '',
        isProcessingPayment: false,
        isCollectingPaymentMethod: false,
      });
    }
  };

  // ========== TESTING ==========

  handleTestClockCreation = async () => {
    this.setState({
      isProcessingTestClock: true,
      statusText: 'Creating test clock...',
    });

    try {
      const response = await fetch(
        `${this.state.backendURL}/create-test-clock`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      this.setState({
        isProcessingTestClock: false,
        statusText: '',
        selectedTestCard: data.test_card,
      });
    } catch (err) {
      this.setState({
        isProcessingTestClock: false,
        statusText: '',
        errorText: err.message,
      });
    }
  };

  // ========== PRODUCTS ==========

  loadProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/products');
      if (!response.ok) throw new Error('Failed to load products');
      const data = await response.json();
      this.setState({ products: data.products || [] });
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  selectProduct = (product) => {
    this.setState({ selectedProduct: product, showProductSelection: false });
  };

  // ========== SESSION MANAGEMENT ==========

  autoConnectSimulator = async () => {
    try {
      const { discoveredReaders } = await StripeTerminal.discoverReaders({
        method: 'internet',
      });

      if (discoveredReaders.length > 0) {
        await this.connectReader(discoveredReaders[0]);
      }
    } catch (err) {
      console.warn('Auto-connect failed:', err);
    }
  };

  startSession = async () => {
    if (!this.state.selectedProduct) {
      alert('Please select a product');
      return;
    }

    if (!this.state.reader) {
      alert('Please connect a reader first');
      return;
    }

    this.setState({
      sessionActive: true,
      sessionStartTime: Date.now(),
      paymentInProgress: false,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: '',
      reminderMinutes: 0,
      showProductSelection: false,
      showWelcomeScreen: false,
    });

    // Fetch pending payment intent from backend
    try {
      const response = await fetch(`${this.state.backendURL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: this.state.selectedProduct.price,
          description: this.state.selectedProduct.name,
        }),
      });

      if (!response.ok) throw new Error('Failed to create payment intent');

      const data = await response.json();
      this.pendingPaymentIntentId = data.payment_intent_id;
      this.currentAuthorizedAmount = this.state.selectedProduct.price;
      this.pricePerMinute = this.state.selectedProduct.price / parseInt(this.state.selectedProduct.name.split(' ')[0]);

      console.log('Payment Intent created:', this.pendingPaymentIntentId);
      console.log('Authorized amount:', this.currentAuthorizedAmount);
      console.log('Price per minute:', this.pricePerMinute);
    } catch (err) {
      console.error('Error creating payment intent:', err);
      alert('Failed to start session');
      this.setState({ sessionActive: false });
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

    let finalCaptureAmount;
    let needIncrement = false;

    if (extraMinutes === 0) {
      finalCaptureAmount = this.state.selectedProduct.price;
    } else {
      finalCaptureAmount = Math.min(totalDue, this.currentAuthorizedAmount);
      needIncrement = totalDue > this.currentAuthorizedAmount;
    }

    // Incrémentation adaptative
    if (needIncrement) {
      let currentAuth = this.currentAuthorizedAmount;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;
      while (currentAuth < totalDue && attempts < MAX_ATTEMPTS) {
        const coveredMinutes = currentAuth / this.pricePerMinute;
        const uncoveredMinutes = Math.max(0, (totalDue / this.pricePerMinute) - coveredMinutes);
        let stepMinutes;
        if (uncoveredMinutes <= 5) stepMinutes = 1;
        else if (uncoveredMinutes <= 15) stepMinutes = 5;
        else stepMinutes = 10;
        if (attempts >= 8 && stepMinutes < 5) stepMinutes = 5;
        const stepCents = Math.ceil(this.pricePerMinute * stepMinutes);
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

    // Construction description
    const productPrice = (this.state.selectedProduct.price / 100).toFixed(2);
    const extraPrice = ((finalCaptureAmount - this.state.selectedProduct.price) / 100).toFixed(2);
    const totalPrice = (finalCaptureAmount / 100).toFixed(2);
    let description = `Produit : ${chosenMinutes} min (${productPrice} €)`;
    if (extraMinutes > 0) description += `\nSupplément : ${extraMinutes} min (${extraPrice} €)`;
    description += `\nTotal : ${totalPrice} €`;

    try {
      // 1. Mettre à jour la description
      await fetch(`${this.state.backendURL}/update-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: this.pendingPaymentIntentId,
          description: description
        })
      }).catch(e => console.warn);

      // 2. Capturer le paiement
      const captureResponse = await fetch(`${this.state.backendURL}/capture-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: this.pendingPaymentIntentId,
          amountToCapture: finalCaptureAmount
        })
      });
      if (!captureResponse.ok) throw new Error((await captureResponse.json()).error);

      alert(`✅ Paiement réussi !\n📆 Temps réel : ${elapsedMinutes} min\n💰 Montant facturé : ${(finalCaptureAmount/100).toFixed(2)} €`);
      if (this.state.timerInterval) clearInterval(this.state.timerInterval);
      
      // Appeler Flask pour confirmer la fin de session
      await fetch('http://localhost:5000/end-session', { method: 'POST' }).catch(e => console.warn);
      
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
      selectedProduct: null,
      showProductSelection: true,
      showWelcomeScreen: true,
      wantReceipt: false,
      wantReminder: false,
      customerEmail: '',
      reminderMinutes: 0,
      paymentInProgress: false,
      pendingPaymentIntentId: null,
      pricePerMinute: 0,
      showKeyboard: false,
    });
    if (this.state.timerInterval) clearInterval(this.state.timerInterval);
    this.resetInactivityTimers();
  };

  cancelSession = () => {
    if (this.state.sessionActive) {
      this.resetSession();
      console.log("Session annulée");
    }
  };

  // ========== REMINDER & TIMER ==========

  checkReminderAndUpdate = () => {
    if (!this.state.sessionActive) return;

    const elapsedMs = Date.now() - this.state.sessionStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (this.state.selectedProduct) {
      const chosenMinutes = parseInt(this.state.selectedProduct.name.split(' ')[0]);
      if (elapsedMinutes >= chosenMinutes && !this.state.wantReminder) {
        console.log(`⏰ Rappel : ${chosenMinutes} minutes écoulées !`);
        this.setState({ wantReminder: true });
      }
    }
  };

  handleReminderSelection = (value) => {
    this.setState({ wantReminder: value });
    if (value) {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + value * 60000);
      console.log(`Rappel défini pour ${reminderTime.toLocaleTimeString()}`);
    }
  };

  renderPrice = (product) => {
    if (!product) return '0.00 €';
    return (product.price / 100).toFixed(2) + ' €';
  };

  // ========== RENDER ==========

  renderForm = () => {
    const {
      isInitializing,
      isInitialized,
      statusText,
      errorText,
      listReadersError,
      updatePaymentIntentError,
      isConnecting,
      isCollectingPaymentMethod,
      isProcessingPayment,
      isConfirmingSetupIntent,
      reader,
      products,
      selectedProduct,
      showProductSelection,
      showWelcomeScreen,
      sessionActive,
      paymentInProgress,
      wantReceipt,
      wantReminder,
      customerEmail,
      selectedTestCard,
      sessionActive,
      paymentInProgress,
      reader,
      products,
      selectedProduct,
      showProductSelection,
      showWelcomeScreen,
    } = this.state;

    if (!isInitialized) {
      return (
        <Spinner
          isInitializing={isInitializing}
          statusText={statusText}
          errorText={errorText}
        />
      );
    }

    if (showWelcomeScreen && !sessionActive) {
      return (
        <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          `}
        >
          <div
            className={css`
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              text-align: center;
            `}
          >
            <h1 style={{ color: '#667eea', marginBottom: '10px' }}>
              Welcome to Parking Station
            </h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              {reader
                ? `✅ Reader connected: ${reader.label}`
                : '❌ No reader connected'}
            </p>
            {!reader && (
              <button
                onClick={this.discoverReaders}
                disabled={isConnecting}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                  marginBottom: '20px',
                }}
              >
                {isConnecting ? 'Connecting...' : 'Connect Reader'}
              </button>
            )}
            <button
              onClick={() => this.setState({ showWelcomeScreen: false })}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (showProductSelection && !sessionActive) {
      return (
        <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          `}
        >
          <div
            className={css`
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              text-align: center;
            `}
          >
            <h1 style={{ color: '#667eea', marginBottom: '30px' }}>
              Select a Product
            </h1>
            <div
              className={css`
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
              `}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => this.selectProduct(product)}
                  style={{
                    padding: '20px',
                    border: selectedProduct?.id === product.id ? '2px solid #667eea' : '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedProduct?.id === product.id ? '#f0f4ff' : 'white',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#333' }}>
                    {product.name}
                  </p>
                  <p style={{ margin: '0', color: '#667eea', fontSize: '1.2em', fontWeight: 'bold' }}>
                    {this.renderPrice(product)}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={this.startSession}
              disabled={!selectedProduct}
              style={{
                padding: '10px 20px',
                background: selectedProduct ? '#28a745' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: selectedProduct ? 'pointer' : 'not-allowed',
              }}
            >
              Start Session
            </button>
          </div>
        </div>
      );
    }

    if (sessionActive) {
      const elapsedMs = Date.now() - this.state.sessionStartTime;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = Math.floor((elapsedMs % 60000) / 1000);

      return (
        <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          `}
        >
          <div
            className={css`
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              text-align: center;
            `}
          >
            <h2>Session en cours</h2>
            <p>Produit : {this.state.selectedProduct?.name} ({this.renderPrice(this.state.selectedProduct)})</p>
            <p style={{ fontSize: '3rem', fontFamily: 'monospace' }}>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</p>
            <button onClick={() => this.endSession()} disabled={paymentInProgress} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {paymentInProgress ? "Paiement en cours..." : "Terminer et payer"}
            </button>
            <button onClick={this.cancelSession} style={{ marginLeft: '10px', padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      );
    }

    return null;
  }

  render() {
    return (
      <div className={css`display: flex; align-items: center; justify-content: center; min-height: 100vh;`}>
        {this.renderForm()}
      </div>
    );
  }
}

export default App;