const ArchiveStorage = (() => {
  const DB_NAME = "archive_local";
  const DB_VERSION = 1;
  const STORE = "memories";

  let dbPromise = null;
  let countCache = { value: null, at: 0 };

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
            store.createIndex("content_hash", "content_hash", { unique: true });
            store.createIndex("created_at", "created_at");
            store.createIndex("platform", "platform");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  function requestToPromise(requestFactory) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE, requestFactory.mode || "readonly");
          const store = transaction.objectStore(STORE);
          const request = requestFactory.run(store);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          transaction.onerror = () => reject(transaction.error);
        })
    );
  }

  async function sha256Hex(value) {
    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function contentHash(platform, url, content, postId = "") {
    const identity = (postId || "").trim() || (url || "").trim();
    return sha256Hex(`${platform}|${identity}|${(content || "").trim()}`);
  }

  function invalidateCount() {
    countCache = { value: null, at: 0 };
  }

  async function count() {
    const now = Date.now();
    if (countCache.value !== null && now - countCache.at < 5000) {
      return countCache.value;
    }
    const total = await requestToPromise({
      mode: "readonly",
      run: (store) => store.count(),
    });
    countCache = { value: total, at: now };
    return total;
  }

  async function getAll(limit = 2000) {
    return requestToPromise({
      mode: "readonly",
      run: (store) => store.getAll(undefined, limit),
    });
  }

  async function save(payload) {
    const platform = (payload.platform || "other").toLowerCase();
    const content = (payload.content || "").trim();
    const postId = (payload.postId || payload.post_id || "").trim();
    const url = ArchiveUrls.normalize(platform, payload.url || "", postId);
    const author = (payload.author || "").trim();

    if (platform === "linkedin" && !ArchiveUrls.isOpenable(url) && !postId) {
      return { status: "rejected", detail: "missing_permalink" };
    }

    const digest = await contentHash(platform, url, content, postId);
    const existing = await requestToPromise({
      mode: "readonly",
      run: (store) => store.index("content_hash").get(digest),
    });

    if (existing) {
      let changed = false;
      if (url && !ArchiveUrls.isOpenable(existing.url)) {
        existing.url = url;
        changed = true;
      } else if (url && existing.url !== url && postId) {
        existing.url = url;
        changed = true;
      }
      if (postId && !existing.post_id) {
        existing.post_id = postId;
        changed = true;
      }
      if (author && (!existing.author || existing.author.toLowerCase() === "linkedin post")) {
        existing.author = author;
        changed = true;
      }
      if (changed) {
        await requestToPromise({
          mode: "readwrite",
          run: (store) => store.put(existing),
        });
      }
      return { status: "duplicate", id: existing.id, url: existing.url };
    }

    const searchable = [payload.title, author, content, platform, postId, url]
      .filter(Boolean)
      .join(" ");
    const embedding = ArchiveEmbeddings.embedText(searchable);

    const record = {
      platform,
      title: (payload.title || "").slice(0, 512),
      content,
      url,
      author: author.slice(0, 256),
      post_id: postId.slice(0, 128),
      content_hash: digest,
      embedding,
      created_at: new Date().toISOString(),
    };

    const id = await requestToPromise({
      mode: "readwrite",
      run: (store) => store.add(record),
    });
    invalidateCount();
    return { status: "saved", id, url };
  }

  async function search(query, limit = 20) {
    const items = await getAll();
    const results = await ArchiveSearch.searchItems(items, query, limit);
    return results.map((item) => ({
      id: item.id,
      platform: item.platform,
      title: item.title,
      content: (item.content || "").slice(0, 320),
      url: ArchiveUrls.normalize(item.platform, item.url, item.post_id),
      author: item.author,
      post_id: item.post_id || "",
      score: Number((item.score || 0).toFixed(4)),
      created_at: item.created_at,
      openable: ArchiveUrls.isOpenable(
        ArchiveUrls.normalize(item.platform, item.url, item.post_id)
      ),
    }));
  }

  async function health() {
    return {
      status: "ok",
      items: await count(),
      mode: "local",
      search_mode: "local",
    };
  }

  return { save, search, health, count };
})();
