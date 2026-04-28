import { getContext } from 'svelte';

// Inlined to avoid reaching into svelte-clerk internals (the package only exports
// useClerkContext, which throws when no provider is mounted).
type StubAuth = {
	userId: string | null;
	sessionId: string | null;
	actor: null;
	sessionStatus: null;
	sessionClaims: null;
	orgId: null;
	orgRole: null;
	orgSlug: null;
	orgPermissions: null;
	factorVerificationAge: null;
};

type ClerkLikeContext = {
	clerk: unknown;
	isLoaded: boolean;
	auth: StubAuth;
	client: unknown;
	session: unknown;
	user: { firstName?: string | null; lastName?: string | null } | null | undefined;
	organization: unknown;
};

const CONTEXT_KEY = '$$_clerk';

const FALLBACK: ClerkLikeContext = {
	clerk: null,
	isLoaded: false,
	auth: {
		userId: null,
		sessionId: null,
		actor: null,
		sessionStatus: null,
		sessionClaims: null,
		orgId: null,
		orgRole: null,
		orgSlug: null,
		orgPermissions: null,
		factorVerificationAge: null
	},
	client: null,
	session: null,
	user: null,
	organization: null
};

/**
 * Like useClerkContext, but returns a signed-out fallback when ClerkProvider is not mounted
 * (e.g. when Clerk env vars aren't configured yet during local development).
 */
export function useClerkSafe(): ClerkLikeContext {
	const ctx = getContext<ClerkLikeContext | undefined>(CONTEXT_KEY);
	return ctx ?? FALLBACK;
}
