# Visual Bible Studier

See where a Bible passage happens, what its world was like, and what its words meant: a map of the places, the scene and cultural background, simple drawings of dress, food and everyday objects, and the Hebrew, Aramaic and Greek behind key words.

**Open the app:** <https://cll2030.github.io/visual-bible-studier/>

- Installs on a phone's home screen and opens offline.
- Every finished study goes into a shared library, so each passage is written once and then opens instantly for everyone.
- Each study can be downloaded or shared as a PDF, each section shared as an image (handy for a group chat), or the study shared as a link.
- Sections collapse and expand.

## How it fits together

| Folder | What it is | Where it runs |
| --- | --- | --- |
| `docs/` | The app: one HTML page, a manifest and an offline cache script | GitHub Pages |
| `server/` | Holds the Claude API key, checks the family passcode, keeps the study library and a monthly limit | Cloudflare Workers |

Writing new studies needs the server set up once: see [SETUP.md](SETUP.md).

Studies are written by Claude from general scholarship and can contain mistakes, especially in dates, coordinates of uncertain sites and vowel pointing. Check anything you plan to teach against a lexicon and a commentary.
