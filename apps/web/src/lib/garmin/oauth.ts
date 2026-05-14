import crypto from "node:crypto";

const REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
const AUTHORIZE_URL = "https://connect.garmin.com/oauthConfirm";
const ACCESS_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/access_token";

function getCreds() {
  const key = process.env.GARMIN_CONSUMER_KEY;
  const secret = process.env.GARMIN_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error(
      "Garmin OAuth not configured. Set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET. Apply at developer.garmin.com.",
    );
  }
  return { key, secret };
}

export function isGarminConfigured() {
  return !!process.env.GARMIN_CONSUMER_KEY && !!process.env.GARMIN_CONSUMER_SECRET;
}

function percentEncode(s: string) {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function sign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret = "",
) {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k]!)}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function authHeader(params: Record<string, string>) {
  return (
    "OAuth " +
    Object.entries(params)
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .join(", ")
  );
}

function nonce() {
  return crypto.randomBytes(16).toString("hex");
}

function timestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

export async function getRequestToken(callbackUrl: string) {
  const { key, secret } = getCreds();

  const params: Record<string, string> = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: key,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp(),
    oauth_version: "1.0",
  };

  params.oauth_signature = sign("POST", REQUEST_TOKEN_URL, params, secret);

  const res = await fetch(REQUEST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: authHeader(params) },
  });

  if (!res.ok) {
    throw new Error(`Garmin request_token failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(body));
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new Error(`Garmin request_token missing fields: ${body}`);
  }

  return {
    oauthToken: parsed.oauth_token,
    oauthTokenSecret: parsed.oauth_token_secret,
    authorizeUrl: `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(parsed.oauth_token)}`,
  };
}

export async function exchangeAccessToken(
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string,
) {
  const { key, secret } = getCreds();

  const params: Record<string, string> = {
    oauth_consumer_key: key,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp(),
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
    oauth_version: "1.0",
  };

  params.oauth_signature = sign("POST", ACCESS_TOKEN_URL, params, secret, oauthTokenSecret);

  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: authHeader(params) },
  });

  if (!res.ok) {
    throw new Error(`Garmin access_token failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(body));
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new Error(`Garmin access_token missing fields: ${body}`);
  }

  return {
    accessToken: parsed.oauth_token,
    accessTokenSecret: parsed.oauth_token_secret,
  };
}
