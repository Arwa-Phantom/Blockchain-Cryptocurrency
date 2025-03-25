"use strict";

let blindSignatures = require('blind-signatures');
let SpyAgency = require('./spyAgency.js').SpyAgency;

function makeDocument(coverName) {
  return `The bearer of this signed document, ${coverName}, has full diplomatic immunity.`;
}

function blind(msg, agency) {
  return blindSignatures.blind({
    message: msg,
    N: agency.n,
    E: agency.e,
  });
}

function unblind(blindingFactor, sig, agency) {
  return blindSignatures.unblind({
    signed: sig,
    N: agency.n,
    r: blindingFactor,
  });
}

let agency = new SpyAgency();

// Step 1: Prepare 10 documents with 10 different cover identities
let coverNames = [
  "Agent X", "Shadow", "Ghost", "Phantom", "Nightfall",
  "Specter", "Raven", "Falcon", "Viper", "Cipher"
];

let originalDocs = coverNames.map(name => makeDocument(name));
let blindingFactors = [];
let blindDocs = originalDocs.map(doc => {
  let { blinded, r } = blind(doc, agency);
  blindingFactors.push(r);
  return blinded;
});

// Step 2: Request agency to sign the documents
agency.signDocument(blindDocs, (selected, verifyAndSign) => {
  console.log(`Spy Agency selected document index: ${selected}`);

  // Step 3: Verify and send data for signing, except the selected document
  let maskedBlindingFactors = blindingFactors.map((factor, index) => 
    index === selected ? undefined : factor
  );
  
  let maskedOriginalDocs = originalDocs.map((doc, index) => 
    index === selected ? undefined : doc
  );

  // Step 4: Receive the blinded signature
  let blindedSignature = verifyAndSign(maskedBlindingFactors, maskedOriginalDocs);

  // Step 5: Unblind the signature
  let finalSignature = unblind(blindingFactors[selected], blindedSignature, agency);

  console.log(`✅ Unblinded signature for document "${originalDocs[selected]}":`, finalSignature);
});
