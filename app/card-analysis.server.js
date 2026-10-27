import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cardSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: [
        "pokemon",
        "football",
        "yugioh",
        "lorcana",
        "one_piece",
        "other",
      ],
    },

    subject: {
      type: ["string", "null"],
    },

    team: {
      type: ["string", "null"],
    },

    set: {
      type: ["string", "null"],
    },

    year: {
      type: ["string", "null"],
    },

    cardNumber: {
      type: ["string", "null"],
    },

    parallel: {
      type: ["string", "null"],
    },

    serial: {
      type: ["string", "null"],
    },

    serialNumber: {
      type: ["integer", "null"],
    },

    printRun: {
      type: ["integer", "null"],
    },

    autograph: {
      type: "boolean",
    },

    memorabilia: {
      type: "boolean",
    },

    rookie: {
      type: "boolean",
    },

    graded: {
      type: "boolean",
    },

    gradingCompany: {
      type: ["string", "null"],
    },

    grade: {
      type: ["string", "null"],
    },

    certificationNumber: {
      type: ["string", "null"],
    },

    language: {
      type: ["string", "null"],
    },

    title: {
      type: "string",
    },

    description: {
      type: "string",
    },

    confidence: {
      type: "number",
    },

    warnings: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "category",
    "subject",
    "team",
    "set",
    "year",
    "cardNumber",
    "parallel",
    "serial",
    "serialNumber",
    "printRun",
    "autograph",
    "memorabilia",
    "rookie",
    "graded",
    "gradingCompany",
    "grade",
    "certificationNumber",
    "language",
    "title",
    "description",
    "confidence",
    "warnings",
  ],

  additionalProperties: false,
};

export async function analyseCard(frontImage, backImage) {
  const content = [
    {
      type: "input_text",
      text: `
You are the card identification system for Gengar's Vault, a UK trading card retailer.

Analyse the supplied photographs carefully.

The photographs may show:
- Pokémon cards
- Football cards
- Yu-Gi-Oh cards
- Disney Lorcana cards
- One Piece cards
- Graded cards/slabs

Identify the exact card as accurately as possible using ONLY information that can reasonably be determined from the photographs.

IMPORTANT RULES:

1. Never invent a serial number, print run, parallel, set, card number, grade or certification number.
2. If something cannot be determined confidently, return null.
3. Carefully inspect BOTH the front and back.
4. A serial such as 1/5 means:
   serial = "1/5"
   serialNumber = 1
   printRun = 5
5. Preserve meaningful leading zeroes in the serial string, but serialNumber and printRun must be integers.
6. Do not assume a parallel purely from its colour unless you are confident.
7. If graded, read the grading company, grade and certification number where visible.
8. "subject" means the player, Pokémon, character, or primary card subject.
9. For football cards, identify the club/team where possible.
10. confidence must be between 0 and 1.
11. Add warnings for anything that should be manually checked.

TITLE:
Create a concise ecommerce product title suitable for Gengar's Vault.

Where applicable favour this structure:
Subject | Serial | Team | Set

Do not include fields that do not exist.

DESCRIPTION:
Write a unique, natural product description suitable for Gengar's Vault.

Do not use generic hype such as:
"must-have"
"stunning"
"perfect addition to any collection"

Do not make claims about condition from photographs.

Vary the writing naturally rather than using a rigid repeated template.

Finish with useful factual card information where appropriate.
      `.trim(),
    },
  ];

  if (frontImage) {
    content.push({
      type: "input_image",
      image_url: await fileToDataUrl(frontImage),
      detail: "high",
    });
  }

  if (backImage) {
    content.push({
      type: "input_image",
      image_url: await fileToDataUrl(backImage),
      detail: "high",
    });
  }

  const response = await openai.responses.create({
    model: "gpt-5.4-mini",

    input: [
      {
        role: "user",
        content,
      },
    ],

    text: {
      format: {
        type: "json_schema",
        name: "card_analysis",
        strict: true,
        schema: cardSchema,
      },
    },
  });

  return JSON.parse(response.output_text);
}

async function fileToDataUrl(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return `data:${file.type};base64,${buffer.toString("base64")}`;
}