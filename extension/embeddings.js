const ArchiveEmbeddings = (() => {
  const DIMENSION = 384;
  const TOKEN_RE = /[a-z0-9]+/g;

  function tokens(text) {
    const normalized = (text || "").toLowerCase();
    const words = normalized.match(TOKEN_RE) || [];
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i += 1) {
      if (words[i].length >= 2 && words[i + 1].length >= 2) {
        bigrams.push(`${words[i]}_${words[i + 1]}`);
      }
    }
    const trigrams = [];
    for (const word of words) {
      if (word.length >= 3) {
        for (let i = 0; i < word.length - 2; i += 1) {
          trigrams.push(word.slice(i, i + 3));
        }
      }
    }
    return words.concat(bigrams, trigrams);
  }

  function hashIndex(token) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const unsigned = hash >>> 0;
    return [unsigned % DIMENSION, (unsigned & 1) === 0 ? 1.0 : -1.0];
  }

  function norm(vector) {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  }

  function embedText(text) {
    const vector = new Float32Array(DIMENSION);
    const parts = tokens(text);
    if (!parts.length) return Array.from(vector);

    for (const token of parts) {
      const [index, sign] = hashIndex(token);
      vector[index] += sign;
    }

    const magnitude = norm(vector);
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i += 1) {
        vector[i] /= magnitude;
      }
    }
    return Array.from(vector);
  }

  function cosineSimilarity(a, b) {
    const va = a || [];
    const vb = b || [];
    const denom = norm(va) * norm(vb);
    if (!denom) return 0;
    let dot = 0;
    const len = Math.min(va.length, vb.length);
    for (let i = 0; i < len; i += 1) {
      dot += va[i] * vb[i];
    }
    return dot / denom;
  }

  return { DIMENSION, embedText, cosineSimilarity };
})();
