/**
 * Ephemeral per-process RSA-OAEP-2048 keypair used to wrap the client's
 * AES-GCM data key when transmitting BYOK secrets. The private key never
 * leaves this process and is regenerated on every restart, which doubles
 * as automatic rotation. Nothing is persisted to disk or env.
 */

let keypairPromise: Promise<CryptoKeyPair> | null = null;
let cachedJwk: JsonWebKey | null = null;

function getKeypair(): Promise<CryptoKeyPair> {
	if (!keypairPromise) {
		keypairPromise = crypto.subtle.generateKey(
			{
				name: 'RSA-OAEP',
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: 'SHA-256'
			},
			true,
			['encrypt', 'decrypt']
		) as Promise<CryptoKeyPair>;
	}
	return keypairPromise;
}

export async function getPublicJwk(): Promise<JsonWebKey> {
	if (cachedJwk) return cachedJwk;
	const { publicKey } = await getKeypair();
	cachedJwk = await crypto.subtle.exportKey('jwk', publicKey);
	return cachedJwk;
}

export type Envelope = {
	encryptedKey: string;
	iv: string;
	ciphertext: string;
};

function b64ToBytes(b64: string): Uint8Array {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/**
 * Decrypts a hybrid envelope produced by `src/lib/ai/encrypt.ts`. Returns the
 * decrypted UTF-8 plaintext (callers should JSON.parse it). Throws on any
 * crypto failure with an opaque message — the error is intentionally vague so
 * the API never leaks oracle hints.
 */
export async function decryptEnvelope(env: Envelope): Promise<string> {
	const { privateKey } = await getKeypair();

	const wrappedAesKey = b64ToBytes(env.encryptedKey);
	const iv = b64ToBytes(env.iv);
	const ciphertext = b64ToBytes(env.ciphertext);

	let rawAesKey: ArrayBuffer;
	try {
		rawAesKey = await crypto.subtle.decrypt(
			{ name: 'RSA-OAEP' },
			privateKey,
			wrappedAesKey as BufferSource
		);
	} catch {
		throw new Error('decrypt_failed');
	}

	let aesKey: CryptoKey;
	try {
		aesKey = await crypto.subtle.importKey(
			'raw',
			rawAesKey,
			{ name: 'AES-GCM' },
			false,
			['decrypt']
		);
	} catch {
		throw new Error('decrypt_failed');
	}

	let plaintext: ArrayBuffer;
	try {
		plaintext = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: iv as BufferSource },
			aesKey,
			ciphertext as BufferSource
		);
	} catch {
		throw new Error('decrypt_failed');
	}

	return new TextDecoder().decode(plaintext);
}
