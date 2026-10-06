# Spec demo

Single HTML file showing the visual system from the spec: era tokens, liquid chrome shader, glitch cut, portal wipe, decode and SYNK-in text reveals, chrome sheen, holo photocard tilt, pinned video rail, member subtabs, Spotify slot.

Run from the repo root so the page can read the fetched media manifest:

```sh
cd ~/work/winter-fansite
python3 -m http.server 4848 --bind 127.0.0.1
open http://127.0.0.1:4848/demo/
```

Arrow keys or the swatch strip switch eras. Opening the file directly also works, with placeholder cards instead of fetched media.

Not in the demo: lightbox morph, FLIP filtering, custom cursor, YouTube background player, curator tool.
