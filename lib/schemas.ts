export const querySchema = {
  type: "object",
  properties: {
    queries: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          query: { type: "string" },
          platform_hint: { type: "string" },
        },
        required: ["query", "platform_hint"],
        additionalProperties: false,
      },
    },
  },
  required: ["queries"],
  additionalProperties: false,
} as const;

export const eventsSchema = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          date: { type: "string" },
          end_date: { type: ["string", "null"] },
          time: { type: ["string", "null"] },
          venue: { type: "string" },
          suburb: { type: "string" },
          description: { type: "string" },
          url: { type: "string" },
          fee: { type: "string" },
          is_free: { type: "boolean" },
          organiser: { type: ["string", "null"] },
          category: { type: "string" },
        },
        required: [
          "name",
          "date",
          "end_date",
          "time",
          "venue",
          "suburb",
          "description",
          "url",
          "fee",
          "is_free",
          "organiser",
          "category",
        ],
        additionalProperties: false,
      },
    },
    sources_searched: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["events", "sources_searched"],
  additionalProperties: false,
} as const;
