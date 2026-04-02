// Client for the example terminal backend
class Client {
  constructor(url) {
    this.url = url;
    this.listLocations = this.listLocations.bind(this);
  }

  createConnectionToken() {
    return this.doPost(this.url + "/connection_token", {});
  }

  registerDevice({ label, registrationCode, location }) {
    const body = {
      label,
      registration_code: registrationCode,
      location
    };
    return this.doPost(this.url + "/register_reader", body);
  }

  createPaymentIntent({ amount, currency, description, paymentMethodTypes }) {
    const body = {
      amount,
      currency,
      description,
      payment_method_types: paymentMethodTypes
    };
    return this.doPost(this.url + "/create_payment_intent", body);
  }

  capturePaymentIntent({ paymentIntentId }) {
    const body = {
      payment_intent_id: paymentIntentId
    };
    return this.doPost(this.url + "/capture_payment_intent", body);
  }

  savePaymentMethodToCustomer({ paymentMethodId }) {
    const body = {
      payment_method_id: paymentMethodId
    };
    return this.doPost(this.url + "/attach_payment_method_to_customer", body);
  }

  async listLocations() {
    const response = await fetch(this.url + "/list_locations", {
      method: "get",
    });

    if (response.ok) {
      return response.json();
    } else {
      let text = await response.text();
      throw new Error("Request Failed: " + text);
    }
  }

  async doPost(url, body) {
    let response = await fetch(url, {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    } else {
      let text = await response.text();
      throw new Error("Request Failed: " + text);
    }
  }
}

export default Client;
