const ESCAPED_UNICODE_RE = /\\u([0-9a-fA-F]{4})/g;
const C1_CONTROL_RE = /[\u0080-\u009F]/;

const MOJIBAKE_MARKERS = [
  "\u00C3",
  "\u00C2",
  "\u00C4",
  "\u0102",
  "\u00C2\u00A0",
  "\u00E2\u0080",
  "\u00E2\u0082\u00AC",
  "\u00E1\u00BA",
  "\u00E1\u00BB",
  "\u00EF\u00BF\u00BD",
  "\uFFFD",
];

const VIETNAMESE_CHAR_RE =
  /[\u0103\u00E2\u0111\u00EA\u00F4\u01A1\u01B0\u0102\u00C2\u0110\u00CA\u00D4\u01A0\u01AF\u00E1\u00E0\u1EA3\u00E3\u1EA1\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u00E9\u00E8\u1EBB\u1EBD\u1EB9\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u00ED\u00EC\u1EC9\u0129\u1ECB\u00F3\u00F2\u1ECF\u00F5\u1ECD\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u00FA\u00F9\u1EE7\u0169\u1EE5\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u00FD\u1EF3\u1EF7\u1EF9\u1EF5]/g;

const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
const utf8Encoder = new TextEncoder();
const singleByteEncoderMaps = new Map();
let vietnameseRepairEntries = null;

const VIETNAMESE_CHARS =
  "\u0103\u00E2\u0111\u00EA\u00F4\u01A1\u01B0\u0102\u00C2\u0110\u00CA\u00D4\u01A0\u01AF" +
  "\u00E1\u00E0\u1EA3\u00E3\u1EA1\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD" +
  "\u00E9\u00E8\u1EBB\u1EBD\u1EB9\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7" +
  "\u00ED\u00EC\u1EC9\u0129\u1ECB" +
  "\u00F3\u00F2\u1ECF\u00F5\u1ECD\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3" +
  "\u00FA\u00F9\u1EE7\u0169\u1EE5\u1EE9\u1EEB\u1EED\u1EEF\u1EF1" +
  "\u00FD\u1EF3\u1EF7\u1EF9\u1EF5" +
  "\u00C1\u00C0\u1EA2\u00C3\u1EA0\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC" +
  "\u00C9\u00C8\u1EBA\u1EBC\u1EB8\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6" +
  "\u00CD\u00CC\u1EC8\u0128\u1ECA" +
  "\u00D3\u00D2\u1ECE\u00D5\u1ECC\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2" +
  "\u00DA\u00D9\u1EE6\u0168\u1EE4\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0" +
  "\u00DD\u1EF2\u1EF6\u1EF8\u1EF4";

const getSingleByteEncoderMap = (label) => {
  if (singleByteEncoderMaps.has(label)) return singleByteEncoderMaps.get(label);

  const decoder = new TextDecoder(label, { fatal: false });
  const map = new Map();
  for (let byte = 0; byte <= 255; byte += 1) {
    const char = decoder.decode(Uint8Array.of(byte));
    if (char && !map.has(char)) {
      map.set(char, byte);
    }
  }

  singleByteEncoderMaps.set(label, map);
  return map;
};

export const decodeEscapedUnicode = (value) => {
  if (typeof value !== "string" || !value.includes("\\u")) return value;
  return value.replace(ESCAPED_UNICODE_RE, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

const looksLikeMojibake = (value) =>
  MOJIBAKE_MARKERS.some((marker) => value.includes(marker)) || C1_CONTROL_RE.test(value);

const encodeSingleByte = (value, label) => {
  const map = getSingleByteEncoderMap(label);
  const bytes = [];

  for (const char of value) {
    const byte = map.get(char);
    if (byte !== undefined) {
      bytes.push(byte);
      continue;
    }

    const code = char.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    return null;
  }

  return Uint8Array.from(bytes);
};

const decodeAsUtf8From = (value, label) => {
  const bytes = encodeSingleByte(value, label);
  if (!bytes) return null;
  return utf8Decoder.decode(bytes);
};

const buildVietnameseRepairEntries = () => {
  const map = new Map();
  const labels = ["windows-1258", "windows-1252", "iso-8859-1"];
  const decoders = labels.map((label) => new TextDecoder(label, { fatal: false }));

  for (const char of VIETNAMESE_CHARS) {
    const forms = new Set();
    for (const decoder of decoders) {
      const once = decoder.decode(utf8Encoder.encode(char));
      forms.add(once);
      for (const nestedDecoder of decoders) {
        forms.add(nestedDecoder.decode(utf8Encoder.encode(once)));
      }
    }

    for (const form of forms) {
      if (form && form !== char) {
        map.set(form, char);
      }
    }
  }

  vietnameseRepairEntries = Array.from(map.entries()).sort((a, b) => b[0].length - a[0].length);
  return vietnameseRepairEntries;
};

const applyKnownVietnameseRepairs = (value) => {
  const entries = vietnameseRepairEntries || buildVietnameseRepairEntries();
  let next = value;
  for (const [broken, repaired] of entries) {
    if (next.includes(broken)) {
      next = next.split(broken).join(repaired);
    }
  }

  return next;
};

const scoreTextQuality = (value) => {
  const vietnameseCount = (value.match(VIETNAMESE_CHAR_RE) || []).length;
  const mojibakeCount = MOJIBAKE_MARKERS.reduce(
    (total, marker) => total + value.split(marker).length - 1,
    0
  );
  const controlCount = (value.match(C1_CONTROL_RE) || []).length;
  const replacementCount = (value.match(/[\uFFFD?]/g) || []).length;

  return vietnameseCount * 4 - mojibakeCount * 8 - controlCount * 6 - replacementCount * 10;
};

export const normalizeVietnameseText = (value) => {
  if (typeof value !== "string") return value;

  let current = applyKnownVietnameseRepairs(decodeEscapedUnicode(value));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!looksLikeMojibake(current)) break;

    const source = current;
    const candidates = ["windows-1258", "windows-1252", "iso-8859-1"]
      .map((label) => decodeAsUtf8From(source, label))
      .filter(Boolean);

    const best = candidates.reduce((winner, candidate) => {
      if (!winner) return candidate;
      return scoreTextQuality(candidate) > scoreTextQuality(winner) ? candidate : winner;
    }, "");

    if (!best || best === current || scoreTextQuality(best) < scoreTextQuality(current)) break;
    current = applyKnownVietnameseRepairs(best);
  }

  return applyKnownVietnameseRepairs(current);
};

export const hasMojibake = (value) => typeof value === "string" && looksLikeMojibake(value);

export const toLooseKey = (value) =>
  normalizeVietnameseText((value ?? "").toString())
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1");

const levenshteinDistance = (a, b) => {
  const x = a || "";
  const y = b || "";
  if (!x) return y.length;
  if (!y) return x.length;

  const dp = Array.from({ length: x.length + 1 }, (_, i) => new Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= y.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[x.length][y.length];
};

export const matchBestOption = (value, options = [], maxDistanceRatio = 0.45) => {
  const source = toLooseKey(value);
  if (!source || !Array.isArray(options) || options.length === 0) return null;

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;
  options.forEach((option) => {
    const candidate = toLooseKey(option);
    if (!candidate) return;
    const distance = levenshteinDistance(source, candidate);
    const ratio = distance / Math.max(source.length, candidate.length, 1);
    if (ratio < bestScore) {
      bestScore = ratio;
      best = option;
    }
  });

  return bestScore <= maxDistanceRatio ? best : null;
};

export const deepNormalizeVietnamese = (payload) => {
  if (typeof payload === "string") return normalizeVietnameseText(payload);

  if (Array.isArray(payload)) {
    return payload.map((item) => deepNormalizeVietnamese(item));
  }

  if (
    (typeof Blob !== "undefined" && payload instanceof Blob) ||
    (typeof File !== "undefined" && payload instanceof File) ||
    (typeof ArrayBuffer !== "undefined" && payload instanceof ArrayBuffer) ||
    (typeof FormData !== "undefined" && payload instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" && payload instanceof URLSearchParams)
  ) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    if (Object.prototype.toString.call(payload) !== "[object Object]") return payload;
    const next = {};
    Object.entries(payload).forEach(([key, value]) => {
      next[key] = deepNormalizeVietnamese(value);
    });
    return next;
  }

  return payload;
};
