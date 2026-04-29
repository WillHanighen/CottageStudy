/**
 * Browser-side hybrid envelope:
 *   1. Generate a one-shot AES-GCM-256 key + 12-byte IV.
 *   2. AES-GCM encrypt JSON.stringify(payload).
 *   3. RSA-OAEP-256 encrypt the raw 32-byte AES key with the server's pubkey.
 *
 * The server's RSA keypair is ephemeral per-process so a fresh JWK is fetched
 * just before encrypting.
 */

export type Envelope = {
	encryptedKey: string;
	iv: string;
	ciphertext: string;
};

function bytesToB64(bytes: Uint8Array): string {
	let s = '';
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s);
}

async function importRsaPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'jwk',
		jwk,
		{ name: 'RSA-OAEP', hash: 'SHA-256' },
		false,
		['encrypt']
	);
}

export async function encryptEnvelope(
	payload: unknown,
	jwk: JsonWebKey
): Promise<Envelope> {
	const aesKey = await crypto.subtle.generateKey(
		{ name: 'AES-GCM', length: 256 },
		true,
		['encrypt']
	);
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const plaintext = new TextEncoder().encode(JSON.stringify(payload));
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: iv as BufferSource },
			aesKey,
			plaintext as BufferSource
		)
	);

	const rawAesKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
	const rsaPub = await importRsaPublicKey(jwk);
	const wrappedAesKey = new Uint8Array(
		await crypto.subtle.encrypt(
			{ name: 'RSA-OAEP' },
			rsaPub,
			rawAesKey as BufferSource
		)
	);

	rawAesKey.fill(0);

	return {
		encryptedKey: bytesToB64(wrappedAesKey),
		iv: bytesToB64(iv),
		ciphertext: bytesToB64(ciphertext)
	};
}

export async function fetchServerPublicKey(): Promise<JsonWebKey> {
	const res = await fetch('/api/ai/pubkey', { credentials: 'same-origin' });
	if (!res.ok) {
		throw new Error(`pubkey_fetch_failed_${res.status}`);
	}
	const body = (await res.json()) as { jwk?: JsonWebKey };
	if (!body?.jwk) throw new Error('pubkey_missing');
	return body.jwk;
}
