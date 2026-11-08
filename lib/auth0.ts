import { Auth0Client } from "@auth0/nextjs-auth0/server";

const isConfigured = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_SECRET &&
    (process.env.AUTH0_CLIENT_SECRET || process.env.AUTH0_CLIENT_ASSERTION_SIGNING_KEY)
);

let client: Auth0Client | undefined;

export function getAuth0Client(): Auth0Client | null {
  if (!isConfigured) return null;

  client ??= new Auth0Client({
    // The app does not need browser-side access tokens; keep them server-side.
    enableAccessTokenEndpoint: false,
  });
  return client;
}
