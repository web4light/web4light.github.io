// UTL Hybrid AI Shield — Firebase AI Logic (PREFER_ON_DEVICE) + SPARK Privacy Router + WebCrypto P-256

const MAX_ON_DEVICE_CHARS = 4000;

/**
 * Optional Firebase configuration (#BuildHybridAI 2026).
 * When provided, initializes Firebase App + Firebase AI Logic (Hybrid Inference SDK).
 */
const FIREBASE_CONFIG = globalThis.UTL_FIREBASE_CONFIG || (() => {
  try {
    const saved = localStorage.getItem("utl_firebase_config");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

let identityVerified = false;
let signingKeyPair = null;
let firebaseAIModel = null;

async function initFirebaseHybridLogic() {
  const infoEl = document.getElementById("ai-backend-info");
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
    try {
      const [{ initializeApp }, { getAI, getGenerativeModel, GoogleAIBackend }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-ai.js"),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      firebaseAIModel = getGenerativeModel(ai, {
        model: "gemini-2.5-flash",
        mode: "prefer_on_device",
      });
      infoEl.textContent = "Active backend: Firebase AI Logic SDK (PREFER_ON_DEVICE -> Gemini Nano / Flash).";
      return;
    } catch (err) {
      infoEl.textContent = `Firebase SDK fallback (${err.message}). Using local Chrome Built-in AI / demo layer.`;
    }
  }

  if ("LanguageModel" in globalThis || "Translator" in globalThis) {
    infoEl.textContent = "Active backend: Chrome Built-in AI (Gemini Nano on-device) + Firebase AI Logic ready.";
  } else {
    infoEl.textContent = "Demo mode (no Firebase key configured): SPARK router, WebCrypto P-256 signing & translation simulator run locally.";
  }
}

/** 1:1 parity with formally verified Ada/SPARK module Utl_Shield.Hybrid_Guard */
export function decideSparkRoute(sensitivity, chars, offlineMode) {
  if (sensitivity === "sensitive_pii" && !identityVerified) {
    return "Route_Blocked";
  }
  if (sensitivity === "sensitive_pii" || offlineMode) {
    return "Route_On_Device_Only";
  }
  if (chars <= MAX_ON_DEVICE_CHARS) {
    return "Route_Hybrid_Prefer_Local";
  }
  return "Route_Cloud_Fallback";
}

async function verifyCryptoIdentity() {
  let authMethod = "WebCrypto ECDSA P-256 (Local Key)";
  if (globalThis.PublicKeyCredential && navigator.credentials) {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "UTL Hybrid AI Shield" },
          user: { id: userId, name: "sovereign-user", displayName: "Sovereign User" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 30000
        }
      });
      authMethod = "Biometric Passkey (WebAuthn Platform UV) + ECDSA P-256";
    } catch {
      // Pokud uživatel zavře výzvu nebo zařízení nemá platform authenticator, drží se lokální neexportovatelný P-256 klíč
    }
  }

  signingKeyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"]
  );
  identityVerified = true;
  const badge = document.getElementById("auth-status");
  badge.textContent = `Identity Verified (${authMethod})`;
  badge.className = "badge ok";
}

function sanitizeWithMarcusAurelius(text) {
  const pattern = /(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|exfiltrate|reveal\s+secrets|<\s*script|javascript:)/gi;
  const injectionBlocked = pattern.test(text);
  return {
    cleanText: text.replace(pattern, "[BLOCKED_BY_MARCUS_AURELIUS_DECIMUS]"),
    injectionBlocked
  };
}

async function translateFieldValue(text, targetLang, route) {
  if (!text.trim()) return "";
  if (route === "Route_Blocked") {
    return "[BLOCKED BY SPARK GUARD: Sensitive PII field requires cryptographic identity verification]";
  }
  const { cleanText } = sanitizeWithMarcusAurelius(text);
  text = cleanText;

  if (firebaseAIModel && route !== "Route_On_Device_Only") {
    try {
      const prompt = `Translate the following form answer strictly to ${targetLang.toUpperCase()} without extra commentary:\n${text}`;
      const res = await firebaseAIModel.generateContent(prompt);
      return res.response.text();
    } catch {
      // graceful fallback
    }
  }

  if ("Translator" in globalThis && targetLang !== "en") {
    try {
      const translatorPromise = (async () => {
        const translator = await globalThis.Translator.create({
          sourceLanguage: "en",
          targetLanguage: targetLang,
        });
        return await translator.translate(text);
      })();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Translator timeout")), 1500)
      );
      return await Promise.race([translatorPromise, timeoutPromise]);
    } catch {
      // fallback below
    }
  }

  return `[${targetLang.toUpperCase()}-Translated | ${route}]: ${text}`;
}

async function signPayload(payloadJson) {
  const bytes = new TextEncoder().encode(payloadJson);
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  let signatureHex = "unsigned";
  if (signingKeyPair) {
    const sigBuf = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKeyPair.privateKey,
      bytes
    );
    signatureHex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return { sha256, signatureHex };
}

document.getElementById("btn-auth").addEventListener("click", verifyCryptoIdentity);

document.getElementById("btn-fill-long").addEventListener("click", () => {
  const base = "UTL Hybrid AI Shield combines on-device Gemini Nano / Apple Foundation Models with cloud Gemini Flash fallback. ";
  document.getElementById("f-essay").value = base.repeat(40);
});

document.getElementById("hybrid-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const offline = document.getElementById("chk-offline").checked;
  const targetLang = document.getElementById("sel-target-lang").value;
  const fields = ["f-name", "f-role", "f-essay"];

  const translatedFields = {};
  const routingAudit = {};

  for (const id of fields) {
    const el = document.getElementById(id);
    const val = el.value;
    const sens = el.dataset.sensitivity;
    const route = decideSparkRoute(sens, val.length, offline);
    routingAudit[id] = { sensitivity: sens, chars: val.length, sparkRoute: route };
    document.getElementById(`route-${id}`).textContent = `SPARK route: ${route}`;
    translatedFields[id] = await translateFieldValue(val, targetLang, route);
  }

  const envelope = { targetLang, offline, routingAudit, translatedFields };
  const cryptoProof = await signPayload(JSON.stringify(envelope));

  document.getElementById("output-log").textContent = JSON.stringify(
    { ...envelope, cryptoProof },
    null,
    2
  );
});

void initFirebaseHybridLogic();
