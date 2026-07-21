# Apple Authentication Configuration

For the app to successfully exchange Apple authorization codes and revoke tokens upon account deletion, the following server environment variables must be configured in production (e.g. Vercel Environment Variables).

## Required Environment Variables

- **`APPLE_TEAM_ID`**: The 10-character Team ID from your Apple Developer account.
- **`APPLE_KEY_ID`**: The 10-character Key ID for the Sign in with Apple private key.
- **`APPLE_CLIENT_ID`**: The client identifier used for the native iOS app authorization (this is the App ID / Bundle ID: `com.samevibe.app`).
- **`APPLE_PRIVATE_KEY`**: The multi-line private key generated from the Apple Developer portal (downloaded as a `.p8` file). This can be provided with actual line breaks or with `\n` literals. 

**Vercel Configuration:**
These must be added as encrypted Environment Variables in the Vercel project settings.

## How the Client ID was Determined
The native Capacitor iOS application uses the bundle identifier natively as the client identifier during Sign in with Apple requests. Therefore, `APPLE_CLIENT_ID` should be set to `com.samevibe.app` rather than a web Services ID, as we are exchanging codes generated natively by the iOS app.

## How to Test Revocation
1. Log into the app on iOS using Sign in with Apple (a new account is required to capture the `authorizationCode` under this new flow).
2. Go to Settings -> Account -> Delete Account.
3. The server will automatically call Apple's `/auth/revoke` endpoint.
4. Verify the backend logs (no "revocation failed" error).
5. Open your iPhone Settings -> Apple ID -> Password & Security -> Apps Using Apple ID. SameVibe should no longer be listed.

## Legacy Account Fallback
Accounts created with Apple prior to Release Set A did not store the `authorizationCode` or `refreshToken`. If a user with a legacy Apple account requests deletion:
1. The backend will detect the Apple provider but the missing `appleRefreshToken`.
2. The account, Firebase identity, and all SameVibe records are still deleted successfully.
3. The server securely logs this as `legacy_no_token` status.
4. The user may be instructed to manually disconnect SameVibe from their Apple ID settings.

## Production Preflight
When running the `deployment-orchestrator.ts` preflight checks, if `APPLE_PRIVATE_KEY` or other credentials are missing, the system will flag the Apple Authentication service as Unconfigured. This indicates that while the app can function, automatic Apple token revocation will degrade to the legacy fallback behavior.
