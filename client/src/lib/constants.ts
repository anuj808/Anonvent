export const ALLOWED_TAGS = [
  "anxiety",
  "relationship",
  "family",
  "work",
  "loneliness",
  "grief",
  "self-esteem",
  "stress",
  "other"
] as const;

export type TagType = typeof ALLOWED_TAGS[number];
