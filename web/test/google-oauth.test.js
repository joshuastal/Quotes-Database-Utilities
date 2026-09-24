const assert = require("node:assert/strict");
const http = require("node:http");
const {test} = require("node:test");

const {
    buildAuthorizationUrl,
    CALLBACK_PORT,
    createGoogleOAuth,
    createPkcePair,
    validateTokenResponse,
} = require("../src/auth/google-oauth.js");

function waitFor(predicate) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + 1_000;

        function check() {
            if (predicate()) {
                resolve();
                return;
            }

            if (Date.now() >= deadline) {
                reject(new Error("Timed out waiting for OAuth test setup."));
                return;
            }

            setTimeout(check, 5);
        }

        check();
    });
}

function requestUrl(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            response.resume();
            response.on("end", () => resolve(response.statusCode));
        });

        request.on("error", reject);
    });
}

test("creates an S256 PKCE pair and a complete authorization URL", () => {
    const pkce = createPkcePair();
    const url = new URL(buildAuthorizationUrl({
        clientId: "client-id.apps.googleusercontent.com",
        redirectUri: "http://127.0.0.1:12345",
        state: pkce.state,
        challenge: pkce.challenge,
    }));

    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "accounts.google.com");
    assert.equal(url.searchParams.get("client_id"), "client-id.apps.googleusercontent.com");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("code_challenge"), pkce.challenge);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("state"), pkce.state);
    assert.equal(url.searchParams.get("prompt"), "select_account");
});

test("rejects malformed token responses", () => {
    assert.throws(
        () => validateTokenResponse(200, "not-json"),
        /invalid sign-in response/
    );
    assert.throws(
        () => validateTokenResponse(200, JSON.stringify({access_token: "only-one-token"})),
        /incomplete sign-in response/
    );
    assert.throws(
        () => validateTokenResponse(
            400,
            JSON.stringify({
                error: "invalid_grant",
                error_description: "The authorization code is invalid.",
            })
        ),
        /did not accept.*invalid_grant.*authorization code is invalid/
    );
});

test("rejects wrong paths and states before exchanging the code", async () => {
    let openedUrl = "";
    let tokenRequestBody = "";
    let tokenRequests = 0;
    const oauth = createGoogleOAuth({
        clientId: "client-id",
        clientSecret: "client-secret",
        openExternal: (url) => {
            openedUrl = url;
        },
        requestToken: async (body) => {
            tokenRequestBody = body;
            tokenRequests += 1;
            return {
                statusCode: 200,
                body: JSON.stringify({id_token: "id", access_token: "access"}),
            };
        },
        timeoutMs: 1_000,
    });
    const signIn = oauth.beginGoogleSignIn();

    await waitFor(() => Boolean(openedUrl));
    const authorization = new URL(openedUrl);
    const redirectUri = authorization.searchParams.get("redirect_uri");
    assert.equal(redirectUri, `http://127.0.0.1:${CALLBACK_PORT}`);
    const wrongPath = new URL(redirectUri);
    wrongPath.pathname = "/wrong";
    wrongPath.search = "?state=bad";
    const wrongPathStatus = await requestUrl(wrongPath);
    const wrongState = new URL(redirectUri);
    wrongState.search = "?state=bad&code=ignored";
    const wrongStateStatus = await requestUrl(wrongState);

    assert.equal(wrongPathStatus, 404);
    assert.equal(wrongStateStatus, 400);
    assert.equal(tokenRequests, 0);

    const callbackStatus = await requestUrl(
        `${redirectUri}?state=${encodeURIComponent(authorization.searchParams.get("state"))}&code=good-code`
    );
    assert.equal(callbackStatus, 200);
    assert.deepEqual(await signIn, {idToken: "id", accessToken: "access"});
    assert.equal(new URLSearchParams(tokenRequestBody).get("client_secret"), "client-secret");
    assert.equal(oauth.isActive(), false);
});

test("handles provider cancellation, concurrency, and timeout cleanup", async () => {
    let openedUrl = "";
    const oauth = createGoogleOAuth({
        clientId: "client-id",
        openExternal: (url) => {
            openedUrl = url;
        },
        timeoutMs: 30,
    });
    const cancelledSignIn = oauth.beginGoogleSignIn();

    await assert.rejects(
        oauth.beginGoogleSignIn(),
        (error) => error.code === "oauth-in-progress"
    );
    await waitFor(() => Boolean(openedUrl));

    const authorization = new URL(openedUrl);
    const redirectUri = authorization.searchParams.get("redirect_uri");
    const cancellationStatus = await requestUrl(
        `${redirectUri}?state=${encodeURIComponent(authorization.searchParams.get("state"))}&error=access_denied`
    );

    assert.equal(cancellationStatus, 200);
    await assert.rejects(
        cancelledSignIn,
        (error) => error.code === "oauth-cancelled"
    );
    assert.equal(oauth.isActive(), false);

    let timeoutUrl = "";
    const timeoutOAuth = createGoogleOAuth({
        clientId: "client-id",
        openExternal: (url) => {
            timeoutUrl = url;
        },
        timeoutMs: 10,
    });
    const timeoutSignIn = timeoutOAuth.beginGoogleSignIn();

    await assert.rejects(timeoutSignIn, (error) => error.code === "oauth-timeout");
    assert.equal(timeoutOAuth.isActive(), false);
    await assert.rejects(
        requestUrl(new URL(timeoutUrl).searchParams.get("redirect_uri")),
        /ECONNREFUSED|socket hang up/
    );
});
