# Matchday — Expo SDK 57 + Supabase

Starter React Native app for the existing football-predictions Supabase project.

## Stack
- Expo SDK 57 / React Native 0.86 / React 19.2.3
- Supabase Auth + Postgres RPC
- AsyncStorage-backed auth session
- Plain React Native UI (no web-only components)

## Included
- Email/password sign-in and sign-up
- Match list with competition and team names
- Match markets and outcome selection
- Prediction submission through `place_prediction`
- My predictions
- Global leaderboard through `get_leaderboard`
- Friends list through `get_friends`
- Profile / sign out

## Connect the existing Supabase project

The app is configured for the existing project reference `uldynuumbiycruavxpht`.

1. Copy `.env.example` to `.env`.
2. Set:
   - `EXPO_PUBLIC_SUPABASE_URL=https://uldynuumbiycruavxpht.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY=` your **publishable** key (`sb_publishable_...`) or legacy anon key.
3. Never put a `service_role` or secret key in a mobile app.
4. Ensure the existing RLS policies allow the intended signed-in reads and RPC calls.

## Install and run

Use Node.js 22.13 or newer.

```bash
npm install
npx expo install --fix
npx expo start
```

For Android:

```bash
npx expo start --android
```

## Database expectations

This starter targets the current schema:
- `matches`, `teams`, `competitions`
- `markets`, `market_outcomes`
- `predictions`
- `profiles`, `user_stats`, `friendships`

RPCs:
- `place_prediction({ p_outcome_id, p_expected_odds })`
- `get_leaderboard({ p_period, p_limit })`
- `get_friends({})`

The UI intentionally calls the database functions rather than inserting predictions directly, so the server-side validation and odds snapshot logic remain authoritative.

## Important
This is a connected starter, not a production release. Verify the exact output shape of leaderboard/friends RPCs and the RLS policies in your project before publishing. Add password reset, email verification UX, push notifications, deep links, robust error states, localization, and automated tests before production.
