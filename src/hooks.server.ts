import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { withClerkHandler } from 'svelte-clerk/server';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { initDb } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';

initDb();

const PROTECTED_PREFIXES = ['/dashboard', '/sets'];

// Clerk's publishable keys look like "pk_test_<base64>" or "pk_live_<base64>".
// We only run the Clerk handler when both keys look real, otherwise the whole
// app errors on every request before any keys are configured.
function isClerkConfigured(): boolean {
	const pk = publicEnv.PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
	const sk = privateEnv.CLERK_SECRET_KEY ?? '';
	const pkOk = /^pk_(test|live)_[A-Za-z0-9+/=_-]{16,}$/.test(pk);
	const skOk = /^sk_(test|live)_[A-Za-z0-9+/=_-]{16,}$/.test(sk);
	return pkOk && skOk;
}

const clerkConfigured = isClerkConfigured();

if (!clerkConfigured) {
	console.warn(
		'[study] Clerk keys not configured — auth is disabled. Set PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env to enable sign-in.'
	);
}

const noAuth: Handle = async ({ event, resolve }) => {
	// Mirror svelte-clerk's runtime shape (a callable returning an AuthObject)
	// so getAuth() works whether Clerk is configured or not.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(event.locals as any).auth = () => ({
		userId: null,
		sessionId: null,
		sessionStatus: null,
		sessionClaims: null,
		actor: null,
		orgId: null,
		orgRole: null,
		orgSlug: null,
		orgPermissions: null,
		factorVerificationAge: null,
		tokenType: 'session_token',
		isAuthenticated: false,
		getToken: async () => null,
		has: () => false,
		debug: () => ({})
	});
	return resolve(event);
};

const protect: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

	if (needsAuth) {
		const { userId } = getAuth(event.locals);
		if (!userId) {
			const returnTo = encodeURIComponent(path + event.url.search);
			throw redirect(303, `/sign-in?redirect=${returnTo}`);
		}
	}

	return resolve(event);
};

export const handle = clerkConfigured
	? sequence(withClerkHandler(), protect)
	: sequence(noAuth, protect);
