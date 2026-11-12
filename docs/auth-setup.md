# Auth setup (manual dashboard steps)

Project ref: `ndgnpkjvmspgdsrifxbe`
Supabase OAuth callback: `https://ndgnpkjvmspgdsrifxbe.supabase.co/auth/v1/callback`

## 1. Supabase → Authentication → URL Configuration

- **Site URL:** `gymbuddy://auth/callback`
  (change to the Vercel web URL later if you want email links to open the web demo by default)
- **Redirect URLs** (add each):
  - `gymbuddy://**` (development and release builds)
  - `exp://**` (Expo Go during development)
  - `http://localhost:8081/**` (web dev server)
  - later: `https://<your-vercel-app>.vercel.app/**`

## 2. Supabase → Authentication → Sign In / Providers → Email

- Email provider: **enabled**
- **Confirm email:** on (recommended)
- Minimum password length: **8** (matches the app's validation)

## 3. Email delivery (important for the demo)

The built-in email service only sends to email addresses of your Supabase organization's team members,
and only a few emails per hour. Anyone else gets `email_address_not_authorized`.

Before showing the app to others, set up free custom SMTP in
**Authentication → Emails → SMTP Settings**, for example Gmail with an App Password
(`smtp.gmail.com`, port `465`, your Gmail address as user, the 16-character app password).
Alternatively, add testers to your Supabase organization, or turn **Confirm email** off only while testing.

## 4. Google Cloud Console

1. https://console.cloud.google.com → create a project (e.g. `GymBuddy`).
2. **APIs & Services → OAuth consent screen** (Google Auth Platform) → **Get started**
   - App name `GymBuddy`, support email: your Gmail
   - Audience: **External**
   - Contact email: your Gmail → Create
3. **Data access** → Add scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` → Save.
4. **Audience → Test users** → add your own Gmail and your instructor's Gmail
   (in Testing mode only listed users can sign in).
5. **Clients → Create client**
   - Application type: **Web application**, name `GymBuddy Supabase`
   - Authorized redirect URIs: `https://ndgnpkjvmspgdsrifxbe.supabase.co/auth/v1/callback`
   - Create → copy **Client ID** and **Client secret**.

No Android client or SHA-1 fingerprint is needed: the app signs in through the browser via Supabase.

## 5. Supabase → Authentication → Sign In / Providers → Google

- Enable **Google**
- Paste **Client ID** and **Client Secret** → Save.

## 6. Test

- Email sign-up/sign-in, forgot password: works in Expo Go and dev builds.
- Google sign-in: use a development build (`eas build --profile development -p android`) so the
  `gymbuddy://` link returns to the app. Expo Go also works if `exp://**` is in Redirect URLs.
