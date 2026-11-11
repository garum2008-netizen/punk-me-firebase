const LINKEDIN = "6a9d9227cd8b9c702c197a40";

const EUDI_TEXT = [
  "Teaching example, not a client matter.",
  "",
  "A supplier treats a typed name at the bottom of an email as enough to change a liability cap.",
  "",
  "Under Regulation (EU) No 910/2014, Article 25, a qualified electronic signature has the equivalent legal effect of a handwritten signature. A typed name or a click can still be evidence of agreement. It is not automatically that qualified form. Regulation (EU) 2024/1183 adds the European Digital Identity Wallet; it does not turn every email sign-off into one.",
  "",
  "Before treating a deal as signed, write down who signed, which document, and which level of signature the contract requires.",
  "",
  "If a cap, an assignment, or a change of control depends on that signature, check the method before you rely on it.",
  "",
  "Inna Kragh · international contract law"
].join("\n");

function note(parts) {
  return ["Teaching example, not a client matter.", "", ...parts, "", "Inna Kragh · international contract law"].join("\n");
}

function pack(fields) {
  return {
    teachingExample: true,
    realClient: false,
    audience: "business",
    approval: "pending_owner",
    language: "en",
    channelId: LINKEDIN,
    service: "linkedin",
    visual: false,
    brand: "INNA KRAGH",
    collisions: [],
    ...fields
  };
}

export const reviewPackages = [
  pack({
    id: "eudi-20261120",
    topic: "eudi-signature",
    idempotencyKey: "ice-eudi-20261120-teach",
    intendedDueAt: "2026-11-20T08:00:00+01:00",
    bufferDraftId: "6af442e5f41d6d2bbb6444d1",
    scenario: "A typed name in an email is treated as a signed change to a liability cap.",
    framework: "Regulation (EU) No 910/2014, Article 25, and Regulation (EU) 2024/1183.",
    risk: "A typed name is not automatically a qualified electronic signature.",
    lesson: "Record who signed, which document, and which signature level the contract requires.",
    cta: "Check the signing method before relying on a cap, an assignment, or a change of control.",
    sources: ["Regulation (EU) No 910/2014, Article 25", "Regulation (EU) 2024/1183"],
    text: EUDI_TEXT
  }),
  pack({
    id: "gdpr-20261204",
    topic: "gdpr-article-28",
    idempotencyKey: "ice-gdpr-20261204-teach",
    intendedDueAt: "2026-12-04T08:00:00+01:00",
    scenario: "A SaaS renewal sets the price and the seats, and never mentions personal data.",
    framework: "GDPR Article 28, including the processing terms in Article 28(3).",
    risk: "If the supplier processes customer personal data, an order form that is silent does not meet Article 28.",
    lesson: "Put the processing terms in the contract before renewal when the supplier hosts personal data.",
    cta: "Ask whether the supplier hosts personal data, and require the processing terms if it does.",
    sources: ["Regulation (EU) 2016/679, Article 28"],
    text: note([
      "A company renews a SaaS tool that stores its customer contacts. The order form sets the price and the seat count. It never says who decides why those contacts are used, or what happens to them when the contract ends.",
      "",
      "When the supplier processes personal data for the customer, Article 28 of the GDPR requires a processing contract. Article 28(3) covers the subject matter, duration, nature and purpose, the type of data, the categories of people, and the processor's duties: follow instructions, keep the data confidential, use the agreed security, control subprocessors, help the customer, and delete or return the data at the end.",
      "",
      "An order form that is silent on processing does not do that work.",
      "",
      "Before renewal, ask whether the supplier hosts personal data. If it does, the processing terms have to be in the contract, not in a later email."
    ])
  }),
  pack({
    id: "nda-20261208",
    topic: "nda-definition",
    idempotencyKey: "ice-nda-20261208-teach",
    intendedDueAt: "2026-12-08T08:00:00+01:00",
    scenario: "An NDA defines confidential information as everything either party discloses.",
    framework: "The definition, the exceptions, and the duration are contractual. A statute is not required to make a vague definition expensive to apply.",
    risk: "The recipient cannot tell what it may use, so a dispute starts with the definition.",
    lesson: "Define the class of information, the exceptions, and the duration before documents are exchanged.",
    cta: "Read the definition before signing, and send the clause for review if it has no exceptions and no end date.",
    sources: ["Contract drafting: definition, exceptions, and duration of a confidentiality duty"],
    text: note([
      "Two companies sign a three-page NDA. Confidential information is defined as all information disclosed by either party. There is no exception for information that is already public, already known, or independently developed, and there is no end date.",
      "",
      "A definition that wide does not tell the recipient what it may use. In a dispute, the time goes into the definition instead of the disclosure.",
      "",
      "Write the class of information, the exceptions, and how long the duty lasts before any documents are exchanged."
    ])
  }),
  pack({
    id: "ip-20261211",
    topic: "consultancy-copyright",
    idempotencyKey: "ice-ip-20261211-teach",
    intendedDueAt: "2026-12-11T08:00:00+01:00",
    scenario: "A consultancy contract promises deliverables and never assigns or licences the copyright.",
    framework: "Danish copyright starts with the author. A consultant is not in the position of an employee, and a transfer of an economic right is read narrowly.",
    risk: "The client may have paid for a copy without receiving the right it expected to use.",
    lesson: "State the assignment or the licence, and its scope, before the work starts.",
    cta: "Check the deliverable clause for an explicit transfer or licence before the consultant begins.",
    sources: ["Danish copyright: the author is the starting point, and an economic transfer should be explicit"],
    text: note([
      "A client pays a consultant for a report and a set of templates. The contract says the deliverables will be provided. It does not assign the copyright and it does not grant a licence.",
      "",
      "Danish copyright starts with the author. A consultant is not in the same position as an employee, and a transfer of an economic right is read narrowly. If the contract never states the transfer or the licence, the client may have paid for a copy without receiving the right it expected to use.",
      "",
      "Agree the assignment or the licence, and its scope, before the work starts."
    ])
  }),
  pack({
    id: "cisg-20261214",
    topic: "cisg-notice",
    idempotencyKey: "ice-cisg-20261214-teach",
    intendedDueAt: "2026-12-14T08:00:00+01:00",
    scenario: "A buyer gives notice of non-conforming machinery several months after delivery.",
    framework: "CISG Articles 38, 39 and 40.",
    risk: "A late notice can remove the right to rely on the lack of conformity, unless Article 40 applies because the seller knew and did not disclose it.",
    lesson: "Examine the goods and specify the non-conformity while the facts are still fresh.",
    cta: "If the CISG applies, put the examination date and the notice in the file. Do not wait for the next season.",
    sources: ["United Nations Convention on Contracts for the International Sale of Goods, Articles 38, 39 and 40"],
    text: note([
      "A buyer receives machinery in March and writes to the seller in November that the goods were non-conforming. The contract is an international sale to which the CISG applies. It sets no special notice period.",
      "",
      "Article 38 requires the buyer to examine the goods within as short a period as is practicable in the circumstances. Article 39 requires notice that specifies the nature of the non-conformity within a reasonable time after the buyer discovered it or ought to have discovered it, and in any event within two years of handover unless that limit is inconsistent with a contractual period of guarantee. Article 40 can keep the seller responsible where the seller knew of the non-conformity and did not disclose it.",
      "",
      "A late notice can remove the right to rely on the lack of conformity. The examination and the notice belong in the file while the facts are still fresh."
    ])
  }),
  pack({
    id: "indemnity-20261218",
    topic: "ip-indemnity-cap",
    idempotencyKey: "ice-indemnity-20261218-teach",
    intendedDueAt: "2026-12-18T08:00:00+01:00",
    scenario: "A software licence gives an intellectual-property indemnity and then caps all liability at the fees paid.",
    framework: "The indemnity and the limitation clause have to be read together. There is no separate rule that an indemnity escapes a cap which says it covers all liability.",
    risk: "If the cap includes the indemnity, the promise may be worth no more than the fees.",
    lesson: "Either carve the indemnity out of the cap, or state in the same clause that the cap limits it.",
    cta: "Read the indemnity and the limitation clause in one pass before signing a software licence.",
    sources: ["Contract construction: an indemnity and a liability cap in the same agreement"],
    text: note([
      "A software licence promises to indemnify the customer if a third party claims that the software infringes intellectual property. Further down, the same contract caps all liability at the fees paid in the previous twelve months. The cap does not say that the indemnity sits outside it.",
      "",
      "If the cap covers the indemnity, the promise may be worth no more than those fees. Read the two clauses together. Either the indemnity is carved out of the cap, or the cap should say, in the same clause, that it limits the indemnity too."
    ])
  }),
  pack({
    id: "language-20261222",
    topic: "prevailing-language",
    idempotencyKey: "ice-language-20261222-teach",
    intendedDueAt: "2026-12-22T08:00:00+01:00",
    scenario: "English and Danish texts are both authentic, and neither says which prevails.",
    framework: "A prevailing-language clause is contractual. Its absence does not void the contract, but it leaves a translation dispute unresolved.",
    risk: "A later divergence turns into an argument about which text governs.",
    lesson: "Choose one prevailing language and say so in both texts.",
    cta: "Before signing two language versions, add one sentence identifying the text that prevails.",
    sources: ["Contract drafting: two authentic texts need a prevailing-language clause"],
    text: note([
      "The contract is signed in English and in Danish. Both texts say they are authentic. Neither text says which one prevails if they differ.",
      "",
      "When a clause later diverges, the dispute starts with a translation argument. Choose one prevailing language, and say so in both texts."
    ])
  }),
  pack({
    id: "subcontract-20261223",
    topic: "saas-subcontract",
    idempotencyKey: "ice-subcontract-20261223-teach",
    intendedDueAt: "2026-12-23T08:00:00+01:00",
    scenario: "A named integration is built by a subcontractor the customer never agreed to.",
    framework: "Authority to subcontract, and responsibility for the subcontractor, are contractual unless a specific mandatory rule applies.",
    risk: "The customer cannot tell who must finish the work, or who answers for it.",
    lesson: "Say which parts may be subcontracted, whether the customer is told, and that the supplier remains responsible.",
    cta: "Check the performance clause before the supplier hands the build to another company.",
    sources: ["Contract drafting: subcontracting and the supplier's remaining responsibility"],
    text: note([
      "A customer hires a supplier to build a named integration. The contract says the supplier will perform the work. It does not say whether a subcontractor may do it. The integration is then built by a company the customer has never contracted with, and the supplier says the result is still its delivery.",
      "",
      "The missing clause is the practical one: which parts may be subcontracted, whether the customer must be told, and that the supplier remains responsible for the subcontractor's work.",
      "",
      "Write that before the work is handed on."
    ])
  })
];

export const held = [
  {
    id: "legal-comedy",
    reason: "No verified legal cartoon or short video is available. A visual post will not be marked ready without one."
  },
  {
    id: "contractbot-product-education",
    reason: "This repository does not contain a verified list of ContractBot product behaviour, so no product claim is drafted."
  },
  {
    id: "books-and-children",
    reason: "PUNK ME ANGEL, Angel&Chris Play, angelinalinakragh, LAW OF CODE and the Emma stories stay outside this legal desk."
  }
];
