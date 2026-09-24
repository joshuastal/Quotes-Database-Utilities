const http = require("node:http");
const https = require("node:https");
const {createHash, randomBytes, timingSafeEqual} = require("node:crypto");

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALLBACK_PATH = "/";
const CALLBACK_PORT = 45678;
const DEFAULT_TIMEOUT_MS = 120_000;

class OAuthError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "OAuthError";
        this.code = code;
    }
}

function requireText(value, name) {
    if (typeof value !== "string" || !value.trim()) {
        throw new OAuthError("oauth-config", `${name} is not configured.`);
    }

    return value;
}

function createPkcePair() {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");

    return {
        state: randomBytes(32).toString("base64url"),
        verifier,
        challenge,
    };
}

function buildAuthorizationUrl({clientId, redirectUri, state, challenge}) {
    const url = new URL(AUTHORIZATION_ENDPOINT);

    url.search = new URLSearchParams({
        client_id: requireText(clientId, "GOOGLE_OAUTH_CLIENT_ID"),
        redirect_uri: requireText(redirectUri, "redirect URI"),
        response_type: "code",
        scope: "openid email profile",
        code_challenge: requireText(challenge, "PKCE challenge"),
        code_challenge_method: "S256",
        state: requireText(state, "OAuth state"),
        prompt: "select_account",
    });

    return url.toString();
}

function statesMatch(expected, received) {
    if (typeof expected !== "string" || typeof received !== "string") {
        return false;
    }

    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);

    return expectedBytes.length === receivedBytes.length
        && timingSafeEqual(expectedBytes, receivedBytes);
}

function validateTokenResponse(statusCode, responseBody) {
    if (statusCode !== 200) {
        let details = "";

        try {
            const payload = JSON.parse(responseBody);
            if (typeof payload.error === "string") {
                const description = typeof payload.error_description === "string"
                    ? `: ${payload.error_description.slice(0, 200)}`
                    : "";
                details = ` (${payload.error}${description})`;
            }
        } catch {
            // Keep the generic error when Google does not return JSON.
        }

        throw new OAuthError(
            "oauth-token-failed",
            `Google did not accept the sign-in request${details}.`
        );
    }

    let payload;

    try {
        payload = JSON.parse(responseBody);
    } catch {
        throw new OAuthError("oauth-token-failed", "Google returned an invalid sign-in response.");
    }

    if (typeof payload.id_token !== "string" || !payload.id_token
        || typeof payload.access_token !== "string" || !payload.access_token) {
        throw new OAuthError("oauth-token-failed", "Google returned an incomplete sign-in response.");
    }

    return {
        idToken: payload.id_token,
        accessToken: payload.access_token,
    };
}

function requestToken(body) {
    return new Promise((resolve, reject) => {
        const request = https.request(TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                "content-length": Buffer.byteLength(body),
            },
        }, (response) => {
            let responseBody = "";

            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                responseBody += chunk;
            });
            response.on("end", () => resolve({
                statusCode: response.statusCode,
                body: responseBody,
            }));
        });

        request.on("error", reject);
        request.end(body);
    });
}

function closeServer(server) {
    return new Promise((resolve) => {
        if (!server.listening) {
            resolve();
            return;
        }

        server.close(() => resolve());
    });
}

function sendCallbackResponse(response, statusCode, message) {
    response.writeHead(statusCode, {"content-type": "text/plain; charset=utf-8"});
    response.end(message);
}

function createGoogleOAuth({
    clientId,
    clientSecret,
    openExternal,
    requestToken: requestTokenImpl = requestToken,
    timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
    let activeAttempt = null;

    async function beginGoogleSignIn() {
        if (activeAttempt) {
            throw new OAuthError("oauth-in-progress", "A Google sign-in is already in progress.");
        }

        requireText(clientId, "GOOGLE_OAUTH_CLIENT_ID");

        if (typeof openExternal !== "function") {
            throw new OAuthError("oauth-config", "The system browser opener is unavailable.");
        }

        const pkce = createPkcePair();
        const server = http.createServer();
        const attempt = {
            callbackStarted: false,
            settled: false,
            server,
            timer: null,
            redirectUri: "",
        };

        activeAttempt = attempt;

        return new Promise((resolve, reject) => {
            const settle = async (error, value) => {
                if (attempt.settled) {
                    return;
                }

                attempt.settled = true;
                clearTimeout(attempt.timer);
                await closeServer(server);

                if (activeAttempt === attempt) {
                    activeAttempt = null;
                }

                if (error) {
                    reject(error);
                } else {
                    resolve(value);
                }
            };

            server.on("error", (error) => {
                void settle(new OAuthError("oauth-server", "The local sign-in callback could not start."), error);
            });

            server.on("request", (request, response) => {
                let callbackUrl;

                try {
                    callbackUrl = new URL(request.url, attempt.redirectUri);
                } catch {
                    sendCallbackResponse(response, 400, "Invalid sign-in callback.");
                    return;
                }

                if (callbackUrl.pathname !== CALLBACK_PATH) {
                    sendCallbackResponse(response, 404, "Not found.");
                    return;
                }

                if (!statesMatch(pkce.state, callbackUrl.searchParams.get("state"))) {
                    sendCallbackResponse(response, 400, "Invalid sign-in state.");
                    return;
                }

                if (attempt.callbackStarted) {
                    sendCallbackResponse(response, 409, "Sign-in callback already received.");
                    return;
                }

                const providerError = callbackUrl.searchParams.get("error");

                if (providerError) {
                    attempt.callbackStarted = true;
                    sendCallbackResponse(response, 200, "Sign-in cancelled; return to the app.");
                    void settle(new OAuthError("oauth-cancelled", "Google sign-in was cancelled."));
                    return;
                }

                const code = callbackUrl.searchParams.get("code");

                if (!code) {
                    sendCallbackResponse(response, 400, "Missing sign-in code.");
                    return;
                }

                attempt.callbackStarted = true;
                sendCallbackResponse(response, 200, "Sign-in complete; return to the app.");

                const body = new URLSearchParams({
                    client_id: clientId,
                    ...(clientSecret ? {client_secret: clientSecret} : {}),
                    code,
                    code_verifier: pkce.verifier,
                    redirect_uri: attempt.redirectUri,
                    grant_type: "authorization_code",
                }).toString();

                void (async () => {
                    try {
                        const tokenResponse = await requestTokenImpl(body);
                        const tokens = validateTokenResponse(
                            tokenResponse.statusCode,
                            tokenResponse.body
                        );
                        await settle(null, tokens);
                    } catch (error) {
                        const oauthError = error instanceof OAuthError
                            ? error
                            : new OAuthError(
                                "oauth-token-failed",
                                "Google sign-in could not be completed."
                            );
                        await settle(oauthError);
                    }
                })();
            });

            server.listen(CALLBACK_PORT, "127.0.0.1", async () => {
                try {
                    const address = server.address();

                    if (!address || typeof address === "string") {
                        throw new OAuthError("oauth-server", "The sign-in callback port is unavailable.");
                    }

                    attempt.redirectUri = `http://127.0.0.1:${address.port}`;
                    const authorizationUrl = buildAuthorizationUrl({
                        clientId,
                        redirectUri: attempt.redirectUri,
                        state: pkce.state,
                        challenge: pkce.challenge,
                    });

                    attempt.timer = setTimeout(() => {
                        void settle(new OAuthError("oauth-timeout", "Google sign-in timed out."));
                    }, timeoutMs);

                    await openExternal(authorizationUrl);
                } catch (error) {
                    const oauthError = error instanceof OAuthError
                        ? error
                        : new OAuthError("oauth-browser", "The system browser could not be opened.");
                    await settle(oauthError);
                }
            });
        });
    }

    return {
        beginGoogleSignIn,
        isActive: () => Boolean(activeAttempt),
    };
}

module.exports = {
    AUTHORIZATION_ENDPOINT,
    CALLBACK_PORT,
    CALLBACK_PATH,
    OAuthError,
    buildAuthorizationUrl,
    createGoogleOAuth,
    createPkcePair,
    validateTokenResponse,
};
