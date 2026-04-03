// ... (même code jusqu'à endSession)

endSession = async () => {
  if (this.state.paymentInProgress) return;
  if (!this.state.sessionStartTime || !this.state.selectedProduct) {
    alert("Aucune session en cours");
    return;
  }

  this.setState({ paymentInProgress: true });

  const elapsedMs = Date.now() - this.state.sessionStartTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const chosenMinutes = parseInt(this.state.selectedProduct.name.split(' ')[0]);
  let extraMinutes = Math.max(0, elapsedMinutes - chosenMinutes);
  const extraAmount = extraMinutes * EXTRA_MINUTE_PRICE;
  const totalAmount = this.state.chargeAmount + extraAmount;

  const description = `Qnook - ${this.state.selectedProduct.name}${extraMinutes > 0 ? ` + ${extraMinutes} min supp` : ''}`;

  try {
    // Créer le PaymentIntent avec le montant total
    const createIntentResponse = await this.client.createPaymentIntent({
      amount: totalAmount,
      currency: this.state.currency,
      description: description,
      paymentMethodTypes: ["card_present"],
      email: this.state.wantReceipt ? this.state.customerEmail : undefined
    });
    const clientSecret = createIntentResponse.client_secret;

    // Configurer le simulateur
    const simulatorConfiguration = {
      testPaymentMethod: this.state.testPaymentMethod,
      testCardNumber: this.state.testCardNumber
    };
    if (this.state.simulateOnReaderTip) simulatorConfiguration.tipAmount = Number(this.state.tipAmount);
    this.terminal.setSimulatorConfiguration(simulatorConfiguration);

    // Collecter le paiement
    const collectResult = await this.terminal.collectPaymentMethod(clientSecret);
    if (collectResult.error) throw new Error(collectResult.error.message);

    // Traiter le paiement
    const confirmResult = await this.terminal.processPayment(collectResult.paymentIntent);
    if (confirmResult.error) throw new Error(confirmResult.error.message);

    alert(`Paiement réussi !\nTemps réel : ${elapsedMinutes} min\nSupplément : ${extraMinutes} min (${(extraAmount/100).toFixed(2)} €)\nTotal : ${(totalAmount/100).toFixed(2)} €`);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.setState({
      sessionActive: false,
      sessionStartTime: null,
      showProductSelection: true,
      selectedProduct: null,
      chargeAmount: 100,
      paymentInProgress: false,
      showEmailForm: false,
      emailSubmitted: false,
    });
  } catch (err) {
    console.error(err);
    alert(`Erreur : ${err.message}`);
    this.setState({ paymentInProgress: false });
  }
};

// ... (le reste du fichier inchangé)
