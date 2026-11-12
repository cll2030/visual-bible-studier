# Setting up the study server

The app itself is already live on GitHub Pages. Studies already in the library (James 4 and James 5 to start) open without any of this. Writing **new** studies needs the small server in `server/`, which holds your Claude API key so it never reaches anyone's phone.

This takes about 15 minutes, once.

## 1. Claude API key

1. Go to the Claude Console at <https://console.anthropic.com> and sign in or sign up.
2. Under **Billing**, add some credit. $10 goes a long way: each new study costs roughly 25 cents with the default model, and a passage is only ever paid for once.
3. Optional but recommended: under **Limits**, set a monthly spend limit.
4. Under **API keys**, create a key named "Bible Studier" and copy it somewhere safe for step 3. It starts with `sk-ant-`.

## 2. Cloudflare account

Sign up for free at <https://dash.cloudflare.com/sign-up>. The free plan is plenty.

## 3. Put the server online

On a computer with [Node.js](https://nodejs.org) installed, open a terminal and run these one at a time:

```sh
git clone https://github.com/cll2030/visual-bible-studier
cd visual-bible-studier/server
npm install
npx wrangler login                          # opens the browser: allow access to Cloudflare
npm run setup                               # creates the study library
npx wrangler secret put ANTHROPIC_API_KEY   # paste the key from step 1
npx wrangler secret put FAMILY_PASSCODE     # make up a passcode for the family
npm run deploy                              # prints the server's address
npm run seed                                # adds James 4 and James 5 to the library
```

`npm run deploy` prints an address like `https://visual-bible-studier.yourname.workers.dev`. Keep it for the next step.

## 4. Point the app at the server

Either:

- **For everyone:** put the address in `docs/config.js` (`window.VBS_SERVER = "https://..."`) and push. Or send it to Claude and ask it to do this.
- **Just on one phone:** open the app, tap **Settings**, and paste it in **Server address**.

Then, in Settings, enter the family passcode and tap **Save and check**. It should say "Connected".

## 5. Install it on your phone

- **iPhone or iPad:** open the app in Safari, tap the Share button, then **Add to Home Screen**.
- **Android:** open the app in Chrome and tap **Install app** (or the menu, then **Install app**).

## Changing things later

All of these are in `server/wrangler.toml`. Run `npm run deploy` again after any change.

| Setting | What it does |
| --- | --- |
| `MODEL` | Which Claude model writes studies. `claude-sonnet-5-5` costs about half as much as the default `claude-opus-5-5`. |
| `MONTHLY_STUDY_LIMIT` | How many new studies can be written each month (default 60). Opening library studies is always free. |
| `ALLOWED_ORIGINS` | Which websites may use the server. |

To change the passcode, run `npx wrangler secret put FAMILY_PASSCODE` again. Anyone using the old passcode is asked for the new one next time they write a study.
