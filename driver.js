"use strict";

// required: npm install blind-signatures
const blindSignatures = require('blind-signatures');
const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

// Details about the bank's key
const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BANK_KEY.keyPair.n.toString();
const E = BANK_KEY.keyPair.e.toString();

/**
 * Function signing the coin on behalf of the bank.
 * 
 * @param blindedCoinHash - the blinded hash of the coin.
 * @returns the signature of the bank for this coin.
 */
console.log("=== Debug Before Signing ===");
console.log("blinded:", coin.blinded);
console.log("privateKey.n:", BANK_KEY.keyPair.privateKey.n?.toString());
console.log("privateKey.d:", BANK_KEY.keyPair.privateKey.d?.toString());


function signCoin(blindedCoinHash) {
  return blindSignatures.sign({
    blinded: blindedCoinHash.toString(),
    key: {
      n: BANK_KEY.keyPair.privateKey.n.toString(),
      d: BANK_KEY.keyPair.privateKey.d.toString()
    },
  });
}


/**
 * Parses a string representing a coin, and returns the left/right identity string hashes.
 *
 * @param {string} s - string representation of a coin.
 * @returns {[[string]]} - two arrays of strings of hashes, committing the owner's identity.
 */
function parseCoin(s) {
  let [cnst, amt, guid, leftHashes, rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} received, but ${BANK_STR} expected`);
  }
  let lh = leftHashes.split(',');
  let rh = rightHashes.split(',');
  return [lh, rh];
}

/**
 * Procedure for a merchant accepting a token.
 * The merchant randomly selects the left or right halves of the identity string.
 * 
 * @param {Coin} coin - the coin that a purchaser wants to use.
 * @returns {[String]} - an array of strings, each holding half of the user's identity.
 */
function acceptCoin(coin) {
  // 1) Verify that the signature is valid.
  const valid = blindSignatures.verify({
    unblinded: coin.signature,
    message: coin.hash || coin.toString(), // fallback if coin.hash undefined
    key: {
      n: coin.n,
      e: coin.e
    }
  });

  if (!valid) {
    throw new Error("Invalid signature. Coin rejected.");
  }

  // 2) Select RIS side randomly.
  const [leftHashes, rightHashes] = parseCoin(coin.toString());
  const ris = [];

  const isLeft = Math.random() < 0.5;
  const selectedHashes = isLeft ? leftHashes : rightHashes;

  for (let i = 0; i < COIN_RIS_LENGTH; i++) {
    const ident = coin.getRis(isLeft, i);
    const hash = utils.hash(ident);
    if (hash !== selectedHashes[i]) {
      throw new Error(`Hash mismatch at index ${i}`);
    }
    ris.push(ident);
  }

  return ris;
}

/**
 * If a token has been double-spent, determine who is the cheater
 * and print the result to the screen.
 * 
 * @param guid - Globally unique identifier for coin.
 * @param ris1 - Identity string reported by first merchant.
 * @param ris2 - Identity string reported by second merchant.
 */
function determineCheater(guid, ris1, ris2) {
  for (let i = 0; i < COIN_RIS_LENGTH; i++) {
    if (ris1[i] !== ris2[i]) {
      const xorBuffer = Buffer.alloc(ris1[i].length);
      for (let j = 0; j < xorBuffer.length; j++) {
        xorBuffer[j] = ris1[i][j] ^ ris2[i][j];
      }
      const xorResult = xorBuffer.toString();
      if (xorResult.startsWith(IDENT_STR)) {
        const identity = xorResult.slice(IDENT_STR.length);
        console.log(`Double spending detected for coin ${guid}`);
        console.log(`The cheater is the coin owner: ${identity}`);
        return;
      }
    }
  }

  console.log(`Double spending detected for coin ${guid}`);
  console.log("The cheater is the merchant.");
}

// ---------------------- TESTING FLOW ----------------------

// Step 1: Create a coin for "alice" worth 20 units
// Step 1: Create a coin for "alice" worth 20 units
// Step 1: Create a coin for "alice" worth 20 units
// Step 1: Create a coin for "alice" worth 20 units
let coin = new Coin('alice', 20, N, E);

// Debug info (بعد إنشاء الكائن)
console.log("=== Debug Before Signing ===");
console.log("blinded:", coin.blinded);
console.log("privateKey.n:", BANK_KEY.keyPair.privateKey.n.toString());
console.log("privateKey.d:", BANK_KEY.keyPair.privateKey.d.toString());

// Step 2: Bank signs the blinded hash
coin.signature = signCoin(coin.blinded.toString());


// Step 3: Unblind the signature
coin.unblind();

// Step 4: Merchant 1 accepts the coin
let ris1 = acceptCoin(coin);

// Step 5: Merchant 2 accepts the same coin (simulate double spending)
let ris2 = acceptCoin(coin);

// Step 6: Bank detects the double-spending and analyzes
console.log("\n== Double Spending Analysis ==");
determineCheater(coin.guid, ris1, ris2);

// Step 7: Test scenario where merchant is the cheater (same RIS)
console.log("\n== Merchant Cheating Test ==");
determineCheater(coin.guid, ris1, ris1);
