"use strict";

const { Client, XFER } = require('./client.js');
const net = require('./fakeNet.js');

class StrictClient extends Client {
  punishCheater(name) {
    this.log(`Client ${name} is a cheater.  The wicked will be punished.`);
    delete this.ledger[name];
    delete this.clients[name];
  }
}

let alice = new StrictClient('Alice', net);
alice.ledger = {
  'Alice': 800,
};
alice.clients = {
  'Alice': alice.keypair.public,
};

let bob = new StrictClient('Bob', net);
let charlie = new StrictClient('Charlie', net);
let trudy = new StrictClient('Trudy', net);

alice.give('Bob', 150);
alice.give('Charlie', 75);
alice.give('Trudy', 250);
bob.give('Charlie', 15);
console.log();

alice.showLedger();
bob.showLedger();
charlie.showLedger();
trudy.showLedger();
console.log();

trudy.fakeGive = function(name, amount) {
  let message = {
    from: this.name,
    to: name,
    amount: amount,
  };
  let signature = this.signObject(message);
  net.send(name, XFER, {message: message, signature: signature});
  this.log(`Secretly sent ${amount} to ${name}`);
}

trudy.fakeGive('Bob', 100);
bob.give('Charlie', 200);

console.log();
alice.showLedger();
charlie.showLedger();
trudy.showLedger();
bob.showLedger();