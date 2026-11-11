const LINKEDIN = "6a9d9227cd8b9c702c197a40";
const FACEBOOK = "6a9d9398cd8b9c702c1981cd";
const EARLIER_SIGNATURE_DRAFT = "6af442e5f41d6d2bbb6444d1";

function close(lines, signoff) {
  return ["Teaching example, not a client matter.", "", ...lines, "", signoff].join("\n");
}

function post(fields) {
  return {
    teachingExample: true,
    realClient: false,
    audience: "business",
    approval: "pending_owner",
    language: "en",
    visual: false,
    collisions: [],
    ...fields
  };
}

const topics = [
  {
    id: "eudi-20261120",
    topic: "eudi-signature",
    linkedinDue: "2026-11-20T08:00:00+01:00",
    facebookDue: "2026-11-20T12:00:00+01:00",
    review: "Corrected against Article 25(1) and 25(2) of Regulation (EU) No 910/2014. A typed name is not treated as void, and it is not treated as a qualified electronic signature. Regulation (EU) 2024/1183 does not change that distinction. The earlier LinkedIn draft stays untouched.",
    linkedinCollisions: [EARLIER_SIGNATURE_DRAFT],
    linkedin: [
      "A supplier treats a typed name at the bottom of an email as enough to change a liability cap.",
      "",
      "Article 25(1) of Regulation (EU) No 910/2014 says an electronic signature is not denied legal effect, or admissibility as evidence, merely because it is electronic or is not qualified. Article 25(2) is narrower: only a qualified electronic signature has the equivalent legal effect of a handwritten signature. A qualified signature is an advanced signature, created with a qualified creation device, and based on a qualified certificate. Apart from that rule, national law decides the effect of a simple or advanced signature.",
      "",
      "A typed name is not, by itself, a qualified electronic signature. That does not make the amendment automatically void. It means the email should not be treated as a handwritten signature.",
      "",
      "Regulation (EU) 2024/1183 adds the European Digital Identity Wallet. The wallet does not turn an ordinary email sign-off into a qualified signature.",
      "",
      "Before relying on a change to a cap, an assignment, or a change of control, write down who signed, which document, and which level of signature the contract requires."
    ],
    facebook: [
      "An email that ends with a typed name is being used to change a liability cap.",
      "",
      "Under Article 25(1) of Regulation (EU) No 910/2014, an electronic signature keeps its possible legal effect even though it is electronic. Under Article 25(2), only a qualified electronic signature stands in for a handwritten signature. That qualified form needs an advanced signature, a qualified certificate, and a qualified creation device.",
      "",
      "A typed name does not meet that test by itself. Do not read this as “the change is void”. Read it as “this is not a handwritten signature, so check the contract and the applicable law”.",
      "",
      "The European Digital Identity Wallet under Regulation (EU) 2024/1183 does not convert the email into a qualified signature.",
      "",
      "If a cap, an assignment, or a change of control depends on that email, record who signed, which text, and which signature level was required."
    ]
  },
  {
    id: "gdpr-20261204",
    topic: "gdpr-article-28",
    linkedinDue: "2026-12-04T08:00:00+01:00",
    facebookDue: "2026-12-04T12:00:00+01:00",
    review: "Article 28 applies only where the supplier processes personal data on behalf of the customer. A supplier that decides purposes and means may be a controller. Sub-processors need prior authorisation under Article 28(2), not a vague duty to “control” them.",
    linkedin: [
      "A company renews a SaaS subscription that stores customer contacts. The order form states the price and the number of seats. It says nothing about personal data.",
      "",
      "Article 28 of the GDPR applies when the supplier processes personal data on behalf of the customer. It does not apply merely because data sits on the supplier’s system. If the supplier decides the purposes and means itself, it may be a controller, and a processor contract is the wrong instrument.",
      "",
      "Where the supplier is a processor, Article 28(3) requires a contract that states the subject matter, duration, nature and purpose, the type of data, the categories of people, and the controller’s instructions. The processor must act only on documented instructions, keep the data confidential, apply the Article 32 security measures, and delete or return the data at the end. Article 28(2) requires the controller’s prior specific or general written authorisation before another processor is engaged.",
      "",
      "An order form that never mentions processing does not do that work.",
      "",
      "Before renewal, ask whether this supplier processes personal data on your behalf. If it does, the processing terms belong in the contract."
    ],
    facebook: [
      "A SaaS renewal states the price and the seats. It never mentions the customer contacts stored in the tool.",
      "",
      "Article 28 of the GDPR is the processor contract. It applies when the supplier processes personal data for the customer, not whenever data happens to sit on the supplier’s servers. A supplier that chooses the purposes and means may be a controller instead.",
      "",
      "If it is a processor, Article 28(3) calls for the subject matter, duration, nature and purpose, the type of data, the categories of people, and the customer’s instructions. Article 28(2) also requires prior written authorisation before a sub-processor is added.",
      "",
      "Settle that question before the renewal. A silent order form does not answer it."
    ]
  },
  {
    id: "nda-20261208",
    topic: "nda-definition",
    linkedinDue: "2026-12-08T08:00:00+01:00",
    facebookDue: "2026-12-08T12:00:00+01:00",
    review: "Drafting guidance only. A definition of “all information” is not described as void. The recovered NDA still about a consultancy fee was not attached.",
    linkedin: [
      "Two companies sign a three-page NDA. Confidential information means all information either party discloses. There is no exception for information that is already public, already known, or independently developed, and there is no end date.",
      "",
      "No statute is required to make that definition expensive. The recipient cannot tell what it may use. If the parties later disagree, the argument starts with the definition rather than with a particular disclosure. The clause is not automatically void. It is unclear.",
      "",
      "Write the class of information, the exceptions, and how long the duty lasts before any documents are exchanged."
    ],
    facebook: [
      "An NDA defines confidential information as everything either party discloses. It has no exceptions and no end date.",
      "",
      "That wording does not, by itself, cancel the NDA. It leaves the recipient unable to see what it may use. A later dispute then begins with the definition.",
      "",
      "Before documents move, write what is covered, what is not, and how long the duty lasts."
    ]
  },
  {
    id: "ip-20261211",
    topic: "consultancy-copyright",
    linkedinDue: "2026-12-11T08:00:00+01:00",
    facebookDue: "2026-12-11T12:00:00+01:00",
    review: "Cited to the Danish Copyright Act: section 53(2) on copies, section 53(3) on the narrow reading of an assignment, and section 59, which moves copyright in an employee’s computer program to the employer and does not cover a consultant.",
    linkedin: [
      "A client pays a consultant for a report and a set of templates. The contract says the deliverables will be provided. It does not assign the copyright and it does not grant a licence.",
      "",
      "Under section 53(2) of the Danish Copyright Act, handing over copies does not hand over the copyright. Section 53(3) reads an assignment narrowly: a right to use the work in a stated way does not include another way. Section 59 moves the copyright in a computer program to the employer when an employee creates it in the course of the work. A consultant is not an employee, so section 59 does not make that transfer.",
      "",
      "The client may have paid for a copy without receiving the use it expected. State the assignment or the licence, and its scope, before the work starts."
    ],
    facebook: [
      "A consultancy contract says the report and the templates will be delivered. It never assigns the copyright or grants a licence.",
      "",
      "Section 53(2) of the Danish Copyright Act keeps copyright with the author when copies are delivered. Section 53(3) does not stretch an assignment beyond the use it actually states. Section 59 can move an employee’s computer-program copyright to the employer. It does not do that for a consultant.",
      "",
      "Write the assignment or the licence, and how far it goes, before the work starts."
    ]
  },
  {
    id: "cisg-20261214",
    topic: "cisg-notice",
    linkedinDue: "2026-12-14T08:00:00+01:00",
    facebookDue: "2026-12-14T12:00:00+01:00",
    review: "Article 40 is stated as “knew or could not have been unaware”, not merely actual knowledge. The dates in the example do not decide whether notice was too late. The note also depends on the CISG applying and not being excluded.",
    linkedin: [
      "A buyer receives machinery in March and writes in November that the goods were non-conforming. The example assumes an international sale to which the CISG applies and which the parties have not excluded under Article 6. The contract sets no special notice period.",
      "",
      "Article 38 requires examination within as short a period as is practicable in the circumstances. Article 39(1) requires notice that specifies the nature of the lack of conformity, within a reasonable time after the buyer discovered it or ought to have discovered it. If that notice is missed, the buyer loses the right to rely on the lack of conformity. Article 39(2) adds a long-stop of two years from the actual handover, unless that limit is inconsistent with a contractual period of guarantee. Article 40 stops the seller relying on Articles 38 and 39 where the lack of conformity relates to facts the seller knew, or could not have been unaware of, and did not disclose.",
      "",
      "A notice given many months later may be challenged. The dates alone do not decide it. The goods and the circumstances do. Record the examination and the notice while the facts are fresh."
    ],
    facebook: [
      "Machinery arrives in March. The buyer describes the non-conformity in November. This is a teaching example, and only if the CISG applies and has not been excluded.",
      "",
      "Article 38 calls for a prompt examination. Article 39 requires a notice that specifies the defect, given within a reasonable time, and in any event within two years of handover unless a contractual guarantee says otherwise. A missed notice can remove the right to rely on the defect. Article 40 keeps that right open where the seller knew, or could not have been unaware, of the relevant facts and did not disclose them.",
      "",
      "Do not treat the gap from March to November as a verdict. Put the examination and the notice in the file while the facts are still clear."
    ]
  },
  {
    id: "indemnity-20261218",
    topic: "ip-indemnity-cap",
    linkedinDue: "2026-12-18T08:00:00+01:00",
    facebookDue: "2026-12-18T12:00:00+01:00",
    review: "No prediction of how a court will rank the two clauses. The point is that a general cap which says it covers all liability may include the indemnity, and the contract should say so expressly.",
    linkedin: [
      "A software licence promises to indemnify the customer if a third party claims that the software infringes intellectual property. Later, the same contract caps all liability at the fees paid in the previous twelve months. The cap does not say whether the indemnity sits outside it.",
      "",
      "There is no general rule that an indemnity escapes a cap which says it covers all liability. Under some governing laws a specific indemnity is read apart from a general cap. Under others the express cap prevails. The result depends on the words and on the law that governs the contract.",
      "",
      "Say expressly whether the cap includes the indemnity. Do not leave the two clauses to be reconciled after a claim."
    ],
    facebook: [
      "A software licence gives an intellectual-property indemnity, then caps all liability at twelve months of fees. It never says whether the cap includes the indemnity.",
      "",
      "An indemnity does not automatically sit outside a cap that covers all liability. Some laws separate the two clauses. Others apply the cap. The contract’s words, and its governing law, decide.",
      "",
      "Write the answer in the cap itself before anyone signs."
    ]
  },
  {
    id: "language-20261222",
    topic: "prevailing-language",
    linkedinDue: "2026-12-22T08:00:00+01:00",
    facebookDue: "2026-12-22T12:00:00+01:00",
    review: "The absence of a prevailing-language clause does not void the contract, and neither text wins automatically.",
    linkedin: [
      "A contract is signed in English and in Danish. Both texts say they are authentic. Neither says which prevails if they differ.",
      "",
      "That gap does not make the contract void. It also does not make one language the winner. If a clause later diverges, the dispute starts as a translation argument, and the answer depends on the governing law and on how the texts were negotiated.",
      "",
      "Choose one prevailing language and say so in both texts."
    ],
    facebook: [
      "The English text and the Danish text are both called authentic. Neither says what happens if they differ.",
      "",
      "The contract does not fall away for that reason, and neither language automatically wins. A later difference becomes a dispute about translation.",
      "",
      "Name one prevailing text, in both languages, before signing."
    ]
  },
  {
    id: "subcontract-20261223",
    topic: "saas-subcontract",
    linkedinDue: "2026-12-23T08:00:00+01:00",
    facebookDue: "2026-12-23T12:00:00+01:00",
    review: "Silence is not treated as a prohibition, and the customer is not told it can reject the work only because a subcontractor performed it.",
    linkedin: [
      "A customer hires a supplier to build a named integration. The contract says the supplier will perform the work. It does not say whether a subcontractor may do it. Another company then builds the integration.",
      "",
      "Silence is not a ban. Unless the contract requires personal performance, the customer cannot treat the work as rejected only because someone else did it. The open question is who remains responsible to the customer.",
      "",
      "Write which parts may be subcontracted, whether the customer is told, and that the supplier remains responsible for that work."
    ],
    facebook: [
      "The contract says the supplier will build a named integration. It never says whether another company may do the building. Another company does it.",
      "",
      "That silence is not, by itself, a prohibition. The customer should not assume it can reject the work only because a subcontractor performed it. What the contract failed to say is who answers to the customer.",
      "",
      "State what may be subcontracted and that the supplier remains responsible."
    ]
  }
];

export const reviewPackages = topics.flatMap((topic) => {
  const shared = {
    topic: topic.topic,
    scenario: topic.linkedin[0],
    framework: topic.review,
    risk: topic.linkedin[2] || topic.linkedin[0],
    lesson: topic.linkedin[topic.linkedin.length - 1],
    cta: topic.linkedin[topic.linkedin.length - 1],
    sources: [topic.review],
    review: topic.review
  };
  return [
    post({
      ...shared,
      id: topic.id + "-li",
      idempotencyKey: "ice-" + topic.id + "-li",
      intendedDueAt: topic.linkedinDue,
      channelId: LINKEDIN,
      service: "linkedin",
      brand: "INNA KRAGH",
      collisions: topic.linkedinCollisions || [],
      text: close(topic.linkedin, "Inna Kragh · international contract law")
    }),
    post({
      ...shared,
      id: topic.id + "-fb",
      idempotencyKey: "ice-" + topic.id + "-fb",
      intendedDueAt: topic.facebookDue,
      channelId: FACEBOOK,
      service: "facebook",
      brand: "Legal Tech Counsellor",
      text: close(topic.facebook, "Legal Tech Counsellor")
    })
  ];
});

export const held = [
  {
    id: "verified-stills-withheld",
    reason: "The SaaS still says access is not acceptance, the NDA still says a consultancy fee is due after acceptance, and the AI Act still says control before release. None of those claims matches these eight lessons, so no image is attached."
  },
  {
    id: "legal-comedy",
    reason: "No verified legal cartoon or short video is available."
  },
  {
    id: "contractbot-product-education",
    reason: "This repository has no verified list of ContractBot product behaviour."
  },
  {
    id: "books-and-children",
    reason: "Children's channels and the book projects stay outside this legal desk."
  }
];

export const earlierSignatureDraft = {
  id: EARLIER_SIGNATURE_DRAFT,
  status: "draft",
  channelId: LINKEDIN,
  note: "Left unchanged. Its text is the earlier version and is not the version in this approval batch."
};
