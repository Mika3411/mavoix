export const BUILT_IN_FRENCH_ABBREVIATIONS: Record<string, string> = {
  c: "c'est",
  e: "est",
  g: "j'ai",
  j: "je",
  l: "elle",
  ls: "elles",
  bcp: "beaucoup",
  bjr: "bonjour",
  bsr: "bonsoir",
  bne: "bonne",
  bonnej: "bonne journée",
  bnuit: "bonne nuit",
  slt: "salut",
  cc: "coucou",
  cv: "ça va",
  ca: "ça",
  ts: "tous",
  tt: "tout",
  tte: "toute",
  ttes: "toutes",
  smpl: "simple",
  smplmt: "simplement",
  pr: "pour",
  prtn: "pourtant",
  prt: "prêt",
  prsk: "presque",
  prsnt: "présent",
  prsnte: "présente",
  prsntatn: "présentation",
  prstatn: "prestation",
  pck: "parce que",
  pcq: "parce que",
  psk: "parce que",
  pke: "parce que",
  pkil: "parce qu'il",
  pkils: "parce qu'ils",
  pkelle: "parce qu'elle",
  pkelles: "parce qu'elles",
  pckil: "parce qu'il",
  pckils: "parce qu'ils",
  pckelle: "parce qu'elle",
  pckelles: "parce qu'elles",
  pcqil: "parce qu'il",
  pcqils: "parce qu'ils",
  pcqelle: "parce qu'elle",
  pcqelles: "parce qu'elles",
  pskil: "parce qu'il",
  pskils: "parce qu'ils",
  pskelle: "parce qu'elle",
  pskelles: "parce qu'elles",
  pk: "pourquoi",
  pq: "pourquoi",
  prk: "pourquoi",
  koi: "quoi",
  ki: "qui",
  ka: "qu'à",
  kil: "qu'il",
  qil: "qu'il",
  kon: "qu'on",
  kl: "qu'elle",
  kls: "qu'elles",
  klk: "quelque",
  klks: "quelques",
  qd: "quand",
  kan: "quand",
  cmt: "comment",
  cmnt: "comment",
  cmmt: "comment",
  cmb: "combien",
  ds: "dans",
  ddn: "dedans",
  avc: "avec",
  ss: "sans",
  ms: "mais",
  dc: "donc",
  nn: "non",
  oklm: "tranquillement",
  tjs: "toujours",
  tjr: "toujours",
  mtn: "maintenant",
  mtnt: "maintenant",
  ajd: "aujourd'hui",
  auj: "aujourd'hui",
  dmn: "demain",
  ap: "après",
  apr: "après",
  pdt: "pendant",
  vrm: "vraiment",
  vrmt: "vraiment",
  mm: "même",
  msg: "message",
  rdv: "rendez-vous",
  tel: "téléphone",
  pb: "problème",
  pbm: "problème",
  qq: "quelque",
  qlq: "quelque",
  qques: "quelques",
  qqs: "quelques",
  qqch: "quelque chose",
  qqc: "quelque chose",
  qqn: "quelqu'un",
  qqun: "quelqu'un",
  dsl: "désolé",
  stp: "s'il te plaît",
  svp: "s'il vous plaît",
  jsp: "je ne sais pas",
  jms: "jamais",
  jtm: "je t'aime",
  jsuis: "je suis",
  chui: "je suis",
  tkt: "ne t'inquiète pas",
  mdr: "mort de rire",
  ptdr: "mort de rire",
  ya: "il y a",
};

const ABBREVIATION_PREFIX_BOUNDARY = "(?:[\\s\\n({]|\\[|\\{)";
const ABBREVIATION_SUFFIX_BOUNDARY = "(?:[\\s\\n,;:.!?)]|\\]|\\})";
const FRENCH_WORD_PATTERN = "[a-zA-ZÀ-ÿ'’-]+";
const CUSTOM_ABBREVIATION_STORAGE_KEY = "maVoixCustomAbbreviations";

const SAVOIR_BY_SUBJECT: Record<string, string> = {
  je: "sais",
  tu: "sais",
  il: "sait",
  elle: "sait",
  on: "sait",
  nous: "savons",
  vous: "savez",
  ils: "savent",
  elles: "savent",
};

const POSSESSIVE_BY_SUBJECT: Record<string, string> = {
  je: "mes",
  tu: "tes",
  il: "ses",
  elle: "ses",
  on: "ses",
  nous: "nos",
  vous: "vos",
  ils: "leurs",
  elles: "leurs",
};

const POSSESSION_VERBS = [
  "ai",
  "as",
  "a",
  "avons",
  "avez",
  "ont",
  "prends",
  "prend",
  "prennent",
  "porte",
  "portes",
  "portent",
  "cherche",
  "cherches",
  "cherchent",
  "perds",
  "perd",
  "perdent",
  "oublie",
  "oublies",
  "oublient",
  "retrouve",
  "retrouves",
  "retrouvent",
  "récupère",
  "récupères",
  "récupèrent",
  "recupere",
  "recuperes",
  "recuperent",
  "mets",
  "met",
  "mettent",
  "garde",
  "gardes",
  "gardent",
];

const PLURAL_NOUN_HINTS = new Set([
  "affaires",
  "amis",
  "bras",
  "chaussures",
  "chaussettes",
  "cles",
  "clés",
  "courses",
  "dents",
  "documents",
  "enfants",
  "habits",
  "jambes",
  "lunettes",
  "mains",
  "medicaments",
  "médicaments",
  "messages",
  "oreilles",
  "parents",
  "papiers",
  "photos",
  "problemes",
  "problèmes",
  "toilettes",
  "vetements",
  "vêtements",
  "yeux",
]);

const NON_PLURAL_AFTER_CEST = new Set([
  "alors",
  "apres",
  "après",
  "assez",
  "dans",
  "dehors",
  "dessous",
  "dessus",
  "jamais",
  "mais",
  "mieux",
  "moins",
  "pas",
  "plus",
  "sans",
  "sous",
  "tres",
  "très",
  "toujours",
  "tous",
]);

const COORDINATION_PRONOUNS = new Set([
  "moi",
  "toi",
  "lui",
  "elle",
  "nous",
  "vous",
  "eux",
  "elles",
]);

const COORDINATION_DAYS = new Set([
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
]);

const COORDINATION_DETERMINERS = new Set([
  "le",
  "la",
  "les",
  "l",
  "un",
  "une",
  "des",
  "du",
  "de",
  "mon",
  "ma",
  "mes",
  "ton",
  "ta",
  "tes",
  "son",
  "sa",
  "ses",
  "notre",
  "nos",
  "votre",
  "vos",
  "leur",
  "leurs",
  "ce",
  "cet",
  "cette",
  "ces",
]);

const KL_MASCULINE_HINTS = new Set([
  "age",
  "avis",
  "besoin",
  "choix",
  "code",
  "document",
  "jour",
  "lieu",
  "message",
  "mois",
  "nom",
  "numero",
  "papier",
  "prenom",
  "probleme",
  "rendez-vous",
  "telephone",
]);

const KL_FEMININE_HINTS = new Set([
  "adresse",
  "affaire",
  "aide",
  "carte",
  "chose",
  "couleur",
  "date",
  "heure",
  "idee",
  "journee",
  "personne",
  "photo",
  "question",
  "raison",
  "reponse",
  "rue",
  "semaine",
  "solution",
  "taille",
  "ville",
]);

const KLS_MASCULINE_HINTS = new Set([
  "amis",
  "avis",
  "besoins",
  "choix",
  "codes",
  "documents",
  "jours",
  "lieux",
  "messages",
  "mois",
  "noms",
  "numeros",
  "papiers",
  "prenoms",
  "problemes",
  "rendez-vous",
  "telephones",
]);

const KLS_FEMININE_HINTS = new Set([
  "adresses",
  "affaires",
  "aides",
  "cartes",
  "chaussures",
  "chaussettes",
  "choses",
  "couleurs",
  "dates",
  "heures",
  "idees",
  "journees",
  "personnes",
  "photos",
  "questions",
  "raisons",
  "reponses",
  "rues",
  "semaines",
  "solutions",
  "tailles",
  "villes",
]);

const KL_PRONOUN_BRIDGES = new Set(["se", "me", "te", "lui"]);

const KL_SINGULAR_VERB_HINTS = new Set([
  "a",
  "attend",
  "comprend",
  "dit",
  "doit",
  "est",
  "fait",
  "met",
  "peut",
  "prend",
  "sait",
  "va",
  "veut",
  "vient",
]);

const FRENCH_ACCENT_REPLACEMENTS: Record<string, string> = {
  aout: "août",
  apres: "après",
  bientot: "bientôt",
  cle: "clé",
  cles: "clés",
  deja: "déjà",
  deces: "décès",
  ecole: "école",
  ecouter: "écouter",
  ecrit: "écrit",
  ecrire: "écrire",
  eleve: "élève",
  etais: "étais",
  etait: "était",
  etaient: "étaient",
  etant: "étant",
  ete: "été",
  etes: "êtes",
  etiez: "étiez",
  etions: "étions",
  etre: "être",
  frere: "frère",
  general: "général",
  generale: "générale",
  hopital: "hôpital",
  hotel: "hôtel",
  idee: "idée",
  idees: "idées",
  medicament: "médicament",
  medicaments: "médicaments",
  medecin: "médecin",
  meme: "même",
  mere: "mère",
  numero: "numéro",
  operation: "opération",
  pere: "père",
  prenom: "prénom",
  probleme: "problème",
  problemes: "problèmes",
  reponse: "réponse",
  reponses: "réponses",
  securite: "sécurité",
  telephone: "téléphone",
  tres: "très",
};

const A_PREPOSITION_PREVIOUS_WORDS = new Set([
  "arrive",
  "arrivent",
  "arrivez",
  "arrivons",
  "arrives",
  "allez",
  "allons",
  "demande",
  "demandent",
  "demandez",
  "demandons",
  "demandes",
  "dis",
  "disent",
  "dit",
  "dites",
  "donne",
  "donnent",
  "donnez",
  "donnons",
  "donnes",
  "part",
  "partent",
  "partez",
  "partons",
  "pars",
  "parle",
  "parlent",
  "parlez",
  "parlons",
  "parles",
  "pense",
  "pensent",
  "pensez",
  "pensons",
  "penses",
  "retourne",
  "retournent",
  "retournez",
  "retournons",
  "retournes",
  "va",
  "vais",
  "vas",
  "vont",
]);

type FormatTextSmartOptions = {
  expandFinalAbbreviation?: boolean;
};

export type AbbreviationSource = "base" | "personnel" | "modifié";

export type AbbreviationEntry = {
  abbreviation: string;
  expansion: string;
  source: AbbreviationSource;
};

export type StoredAbbreviationDictionary = {
  custom: Record<string, string>;
  disabled: string[];
};

export function normalizeAbbreviationKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function normalizeAbbreviationExpansion(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeDictionaryRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [rawKey, rawExpansion]) => {
      const abbreviation = normalizeAbbreviationKey(rawKey);
      const expansion = normalizeAbbreviationExpansion(String(rawExpansion || ""));

      if (abbreviation && expansion) {
        acc[abbreviation] = expansion;
      }

      return acc;
    },
    {} as Record<string, string>
  );
}

function readStoredAbbreviationDictionary(): StoredAbbreviationDictionary {
  if (typeof window === "undefined") {
    return { custom: {}, disabled: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(CUSTOM_ABBREVIATION_STORAGE_KEY);
    if (!rawValue) return { custom: {}, disabled: [] };

    const parsed = JSON.parse(rawValue);
    const looksLikeLegacyRecord =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      !("custom" in parsed) &&
      !("disabled" in parsed);

    const custom = normalizeDictionaryRecord(
      looksLikeLegacyRecord ? parsed : parsed?.custom
    );
    const disabled = Array.isArray(parsed?.disabled)
      ? parsed.disabled
          .map((item: unknown) => normalizeAbbreviationKey(String(item || "")))
          .filter(Boolean)
      : [];

    return {
      custom,
      disabled: Array.from(new Set(disabled)),
    };
  } catch (error) {
    console.error("Impossible de lire le dictionnaire personnalisé :", error);
    return { custom: {}, disabled: [] };
  }
}

function saveStoredAbbreviationDictionary(data: StoredAbbreviationDictionary) {
  if (typeof window === "undefined") return;

  const cleanData = {
    custom: normalizeDictionaryRecord(data.custom),
    disabled: Array.from(
      new Set(
        data.disabled
          .map((item) => normalizeAbbreviationKey(item))
          .filter(Boolean)
      )
    ),
  };

  window.localStorage.setItem(
    CUSTOM_ABBREVIATION_STORAGE_KEY,
    JSON.stringify(cleanData)
  );
}

export function readExportableAbbreviationDictionary(): StoredAbbreviationDictionary {
  return readStoredAbbreviationDictionary();
}

export function importAbbreviationDictionary(value: unknown) {
  if (!value || typeof value !== "object") {
    return;
  }

  const rawDictionary = value as Partial<StoredAbbreviationDictionary>;
  const looksLikeLegacyRecord =
    !("custom" in rawDictionary) && !("disabled" in rawDictionary);
  saveStoredAbbreviationDictionary({
    custom: normalizeDictionaryRecord(
      looksLikeLegacyRecord ? rawDictionary : rawDictionary.custom || {}
    ),
    disabled: Array.isArray(rawDictionary.disabled)
      ? rawDictionary.disabled.map((item) => String(item || ""))
      : [],
  });
}

export function readActiveAbbreviationDictionary() {
  const stored = readStoredAbbreviationDictionary();
  const disabled = new Set(stored.disabled);
  const activeBuiltIns = Object.entries(BUILT_IN_FRENCH_ABBREVIATIONS).reduce(
    (acc, [abbreviation, expansion]) => {
      if (!disabled.has(abbreviation)) {
        acc[abbreviation] = expansion;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    ...activeBuiltIns,
    ...stored.custom,
  };
}

export function readAbbreviationEntries(): AbbreviationEntry[] {
  const stored = readStoredAbbreviationDictionary();
  const disabled = new Set(stored.disabled);
  const keys = new Set([
    ...Object.keys(BUILT_IN_FRENCH_ABBREVIATIONS),
    ...Object.keys(stored.custom),
  ]);

  return Array.from(keys)
    .filter(
      (abbreviation) =>
        Boolean(stored.custom[abbreviation]) || !disabled.has(abbreviation)
    )
    .map((abbreviation) => {
      const isBuiltIn = abbreviation in BUILT_IN_FRENCH_ABBREVIATIONS;
      const customExpansion = stored.custom[abbreviation];
      const source: AbbreviationSource = customExpansion
        ? isBuiltIn
          ? "modifié"
          : "personnel"
        : "base";

      return {
        abbreviation,
        expansion:
          customExpansion || BUILT_IN_FRENCH_ABBREVIATIONS[abbreviation] || "",
        source,
      };
    })
    .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation, "fr"));
}

export function upsertCustomAbbreviation(
  rawAbbreviation: string,
  rawExpansion: string
) {
  const abbreviation = normalizeAbbreviationKey(rawAbbreviation);
  const expansion = normalizeAbbreviationExpansion(rawExpansion);

  if (!abbreviation || !expansion) {
    throw new Error("Abréviation ou texte manquant.");
  }

  const stored = readStoredAbbreviationDictionary();
  stored.custom[abbreviation] = expansion;
  stored.disabled = stored.disabled.filter((item) => item !== abbreviation);
  saveStoredAbbreviationDictionary(stored);

  return { abbreviation, expansion };
}

export function deleteAbbreviation(rawAbbreviation: string) {
  const abbreviation = normalizeAbbreviationKey(rawAbbreviation);
  if (!abbreviation) return;

  const stored = readStoredAbbreviationDictionary();
  delete stored.custom[abbreviation];

  if (abbreviation in BUILT_IN_FRENCH_ABBREVIATIONS) {
    stored.disabled = Array.from(new Set([...stored.disabled, abbreviation]));
  }

  saveStoredAbbreviationDictionary(stored);
}

export function resetAbbreviation(rawAbbreviation: string) {
  const abbreviation = normalizeAbbreviationKey(rawAbbreviation);
  if (!abbreviation) return;

  const stored = readStoredAbbreviationDictionary();
  delete stored.custom[abbreviation];
  stored.disabled = stored.disabled.filter((item) => item !== abbreviation);
  saveStoredAbbreviationDictionary(stored);
}

function normalizeLookup(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'");
}

function looksLikePluralNoun(value: string) {
  const word = normalizeLookup(value).replace(/^'+|'+$/g, "");
  if (!word) return false;
  if (PLURAL_NOUN_HINTS.has(word)) return true;
  if (NON_PLURAL_AFTER_CEST.has(word)) return false;

  return word.length > 3 && (word.endsWith("s") || word.endsWith("x"));
}

function resolveAmbiguousCAbbreviation(value: string) {
  const subjectPattern = Object.keys(SAVOIR_BY_SUBJECT).join("|");
  const possessionVerbPattern = POSSESSION_VERBS.join("|");
  const savoirPattern = new RegExp(
    `\\b(${subjectPattern})\\s+c'est\\b`,
    "gi"
  );
  const jaiPossessionPattern = new RegExp(
    `\\b(j['’]ai)\\s+c'est\\s+(${FRENCH_WORD_PATTERN})`,
    "gi"
  );
  const possessionPattern = new RegExp(
    `\\b(${subjectPattern})\\s+(${possessionVerbPattern})\\s+c'est\\s+(${FRENCH_WORD_PATTERN})`,
    "gi"
  );
  const cesPattern = new RegExp(`\\bc'est\\s+(${FRENCH_WORD_PATTERN})`, "gi");

  return value
    .replace(/\bc'est\s+est\b/gi, "c'est")
    .replace(savoirPattern, (match, subject) => {
      const verb = SAVOIR_BY_SUBJECT[normalizeLookup(subject)];
      return verb ? `${subject} ${verb}` : match;
    })
    .replace(jaiPossessionPattern, (match, prefix, nextWord) =>
      looksLikePluralNoun(nextWord) ? `${prefix} mes ${nextWord}` : match
    )
    .replace(possessionPattern, (match, subject, verb, nextWord) => {
      if (!looksLikePluralNoun(nextWord)) return match;

      const possessive = POSSESSIVE_BY_SUBJECT[normalizeLookup(subject)];
      return possessive ? `${subject} ${verb} ${possessive} ${nextWord}` : match;
    })
    .replace(cesPattern, (match, nextWord) =>
      looksLikePluralNoun(nextWord) ? `ces ${nextWord}` : match
    );
}

function readPreviousFrenchWords(value: string, endIndex: number, limit = 2) {
  const words =
    value
      .slice(0, endIndex)
      .match(new RegExp(FRENCH_WORD_PATTERN, "g")) || [];

  return words.slice(Math.max(0, words.length - limit));
}

function readNextFrenchWord(value: string, startIndex: number) {
  const match = value
    .slice(startIndex)
    .match(new RegExp(`^\\s*(${FRENCH_WORD_PATTERN})`));

  return match?.[1] || "";
}

function readNextFrenchWords(value: string, startIndex: number, limit = 2) {
  const words =
    value
      .slice(startIndex)
      .match(new RegExp(FRENCH_WORD_PATTERN, "g")) || [];

  return words.slice(0, limit);
}

function resolveAmbiguousEAbbreviation(
  value: string,
  wordStartIndex: number,
  wordEndIndex: number
) {
  const previousWords = readPreviousFrenchWords(value, wordStartIndex);
  const previousWord = normalizeLookup(previousWords[previousWords.length - 1]);
  const beforePreviousWord = normalizeLookup(
    previousWords[previousWords.length - 2]
  );
  const nextWord = normalizeLookup(readNextFrenchWord(value, wordEndIndex));

  if (!previousWord || !nextWord) return "est";
  if (COORDINATION_PRONOUNS.has(nextWord)) return "et";
  if (
    COORDINATION_DAYS.has(previousWord) &&
    COORDINATION_DAYS.has(nextWord)
  ) {
    return "et";
  }
  if (
    COORDINATION_DETERMINERS.has(beforePreviousWord) &&
    COORDINATION_DETERMINERS.has(nextWord)
  ) {
    return "et";
  }

  return "est";
}

function resolveAmbiguousKlAbbreviation(
  value: string,
  wordEndIndex: number,
  isPlural: boolean
) {
  const nextWords = readNextFrenchWords(value, wordEndIndex, 2);

  if (!nextWords[0]) return isPlural ? "qu'elles" : "qu'elle";

  return resolveQuelFormForFollowingWords(
    nextWords,
    isPlural ? "qu'elles" : "qu'elle"
  );
}

function matchInitialCase(source: string, replacement: string) {
  return source[0] === source[0]?.toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

function matchWordCase(source: string, replacement: string) {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) {
    return replacement.toUpperCase();
  }

  return matchInitialCase(source, replacement);
}

function shouldRestoreAPreposition(value: string, offset: number) {
  const previousWords = readPreviousFrenchWords(value, offset);
  if (!previousWords.length) return true;

  const previousWord = normalizeLookup(previousWords[previousWords.length - 1]);
  return A_PREPOSITION_PREVIOUS_WORDS.has(previousWord);
}

function restoreMissingFrenchAccents(value: string) {
  const wordCorrected = value.replace(/[a-zA-ZÀ-ÿ]+/g, (word) => {
    const replacement = FRENCH_ACCENT_REPLACEMENTS[normalizeLookup(word)];
    return replacement ? matchWordCase(word, replacement) : word;
  });

  return wordCorrected
    .replace(
      /\bou\s+(est|sont|es|etes|êtes|sera|seront|va|vas|vais|allez|vont|allons|habite|habites|habitent|trouve|trouves|trouvent|suis|sommes)\b/gi,
      (match, verb) => `${matchWordCase(String(match).slice(0, 2), "où")} ${verb}`
    )
    .replace(/\bla\s+bas\b/gi, (match) =>
      `${matchWordCase(String(match).slice(0, 2), "là")}-bas`
    )
    .replace(
      /\ba\s+(la|le|les|l['’]?|un|une|\d+)/gi,
      (match, nextWord, offset, source) =>
        shouldRestoreAPreposition(String(source), Number(offset))
          ? `${matchWordCase(String(match).slice(0, 1), "à")} ${nextWord}`
          : match
    );
}

function resolveQuelFormForNextWord(nextWord: string, fallback: string) {
  const normalizedNextWord = normalizeLookup(nextWord);

  if (KLS_FEMININE_HINTS.has(normalizedNextWord)) return "quelles";
  if (KLS_MASCULINE_HINTS.has(normalizedNextWord)) return "quels";
  if (KL_FEMININE_HINTS.has(normalizedNextWord)) return "quelle";
  if (KL_MASCULINE_HINTS.has(normalizedNextWord)) return "quel";

  return fallback;
}

function resolveQuelFormForVerb(verbWord: string, fallback: string) {
  const normalizedVerb = normalizeLookup(verbWord);

  if (!normalizedVerb) return fallback;
  if (normalizedVerb.length > 3 && normalizedVerb.endsWith("ent")) {
    return "qu'elles";
  }
  if (
    normalizedVerb.endsWith("e") ||
    normalizedVerb.endsWith("a") ||
    KL_SINGULAR_VERB_HINTS.has(normalizedVerb)
  ) {
    return "qu'elle";
  }

  return fallback;
}

function resolveQuelFormForFollowingWords(
  nextWords: string[],
  fallback: string
) {
  const nextWord = nextWords[0] || "";
  const normalizedNextWord = normalizeLookup(nextWord);

  if (KL_PRONOUN_BRIDGES.has(normalizedNextWord)) {
    return resolveQuelFormForVerb(nextWords[1] || "", fallback);
  }

  return resolveQuelFormForVerb(
    nextWord,
    resolveQuelFormForNextWord(nextWord, fallback)
  );
}

function resolveQuIlFormForVerb(verbWord: string, fallback: string) {
  const normalizedVerb = normalizeLookup(verbWord);

  if (!normalizedVerb) return fallback;
  if (normalizedVerb.length > 3 && normalizedVerb.endsWith("ent")) {
    return "qu'ils";
  }
  if (
    normalizedVerb.endsWith("e") ||
    normalizedVerb.endsWith("a") ||
    KL_SINGULAR_VERB_HINTS.has(normalizedVerb)
  ) {
    return "qu'il";
  }

  return fallback;
}

function resolveQuIlFormForFollowingWords(
  nextWords: string[],
  fallback: string
) {
  const nextWord = nextWords[0] || "";
  const normalizedNextWord = normalizeLookup(nextWord);

  if (KL_PRONOUN_BRIDGES.has(normalizedNextWord)) {
    return resolveQuIlFormForVerb(nextWords[1] || "", fallback);
  }

  return resolveQuIlFormForVerb(nextWord, fallback);
}

function resolveAmbiguousKlPhrases(value: string) {
  const pattern = new RegExp(
    `\\bqu['’](elle|elles)\\s+(${FRENCH_WORD_PATTERN})(?:\\s+(${FRENCH_WORD_PATTERN}))?`,
    "gi"
  );

  return value.replace(pattern, (match, pronoun, nextWord, followingWord) => {
    const isPlural = normalizeLookup(pronoun) === "elles";
    const replacement = resolveQuelFormForFollowingWords(
      [nextWord, followingWord].filter(Boolean),
      isPlural ? "qu'elles" : "qu'elle"
    );

    const tail = followingWord ? ` ${followingWord}` : "";
    return replacement
      ? `${matchInitialCase(String(match), replacement)} ${nextWord}${tail}`
      : match;
  });
}

function resolveAmbiguousIlPhrases(value: string) {
  const pattern = new RegExp(
    `\\bqu['’](il|ils)\\s+(${FRENCH_WORD_PATTERN})(?:\\s+(${FRENCH_WORD_PATTERN}))?`,
    "gi"
  );

  return value.replace(pattern, (match, pronoun, nextWord, followingWord) => {
    const isPlural = normalizeLookup(pronoun) === "ils";
    const replacement = resolveQuIlFormForFollowingWords(
      [nextWord, followingWord].filter(Boolean),
      isPlural ? "qu'ils" : "qu'il"
    );
    const tail = followingWord ? ` ${followingWord}` : "";
    return `${matchInitialCase(String(match), replacement)} ${nextWord}${tail}`;
  });
}

function resolveQuelAgreement(value: string) {
  const pattern = new RegExp(
    `\\b(quel|quelle|quels|quelles)\\s+(${FRENCH_WORD_PATTERN})(?:\\s+(${FRENCH_WORD_PATTERN}))?`,
    "gi"
  );

  return value.replace(pattern, (match, currentForm, nextWord, followingWord) => {
    const replacement = resolveQuelFormForFollowingWords(
      [nextWord, followingWord].filter(Boolean),
      currentForm
    );
    const tail = followingWord ? ` ${followingWord}` : "";
    return `${matchInitialCase(String(currentForm), replacement)} ${nextWord}${tail}`;
  });
}

function expandFrenchAbbreviations(
  value: string,
  options: FormatTextSmartOptions = {}
) {
  const suffixBoundary = options.expandFinalAbbreviation
    ? `${ABBREVIATION_SUFFIX_BOUNDARY}|$`
    : ABBREVIATION_SUFFIX_BOUNDARY;
  const abbreviationPattern = new RegExp(
    `(^|${ABBREVIATION_PREFIX_BOUNDARY})([a-zA-ZÀ-ÿ]+)(?=(${suffixBoundary}))`,
    "g"
  );
  const activeDictionary = readActiveAbbreviationDictionary();

  return value.replace(abbreviationPattern, (match, prefix, word, _suffix, offset, source) => {
    const key = normalizeAbbreviationKey(String(word));
    const expanded = activeDictionary[key];
    if (key === "e" && expanded === BUILT_IN_FRENCH_ABBREVIATIONS.e) {
      const wordStartIndex = Number(offset) + String(prefix).length;
      return `${prefix}${resolveAmbiguousEAbbreviation(
        String(source),
        wordStartIndex,
        wordStartIndex + String(word).length
      )}`;
    }
    if (
      (key === "kl" || key === "kls") &&
      expanded === BUILT_IN_FRENCH_ABBREVIATIONS[key]
    ) {
      const wordEndIndex =
        Number(offset) + String(prefix).length + String(word).length;
      return `${prefix}${resolveAmbiguousKlAbbreviation(
        String(source),
        wordEndIndex,
        key === "kls"
      )}`;
    }

    return expanded ? `${prefix}${expanded}` : match;
  });
}

export function formatTextSmart(value, options: FormatTextSmartOptions = {}) {
  if (!value) return value;

  const normalizedSpacing = String(value)
    .replace(/[ \t]+([,;:.!?])/g, "$1")
    .replace(/([,;:.!?])(?!\s|$)/g, "$1 ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  return resolveAmbiguousCAbbreviation(
    restoreMissingFrenchAccents(
      resolveQuelAgreement(
        resolveAmbiguousIlPhrases(
          resolveAmbiguousKlPhrases(expandFrenchAbbreviations(normalizedSpacing, options))
        )
      )
    )
  )
    .replace(/(^\s*\w|[\.\!\?]\s*\w|\n\s*\w)/g, (c) => c.toUpperCase());
}

export function normalizeTextFormatting(value) {
  return formatTextSmart(value, { expandFinalAbbreviation: true });
}
