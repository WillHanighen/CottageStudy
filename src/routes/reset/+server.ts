import type { RequestHandler } from './$types';

/**
 * Nuclear cookie reset. Hits this endpoint to clear every cookie the browser
 * has for this origin — including HttpOnly Clerk session cookies that JS in the
 * page can't touch. Useful when localhost has been polluted by sessions from
 * older Clerk apps and you're stuck in a sign-in redirect loop.
 *
 * Disabled in production since this is a footgun for anyone else.
 */
export const GET: RequestHandler = async ({ request, url }) => {
	if (process.env.NODE_ENV === 'production') {
		return new Response('Not found', { status: 404 });
	}

	const cookieHeader = request.headers.get('cookie') ?? '';
	const names = cookieHeader
		.split(';')
		.map((c) => c.split('=')[0].trim())
		.filter(Boolean);

	const headers = new Headers();
	headers.set('Location', url.searchParams.get('to') ?? '/');

	for (const name of names) {
		// Cover the bases: root path, sign-in path, and the bare cookie. Some Clerk
		// cookies are scoped to "/" with HttpOnly; clearing them all on Path=/ will
		// take care of every variant the browser accepts.
		headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
	}

	return new Response(null, { status: 303, headers });
};
