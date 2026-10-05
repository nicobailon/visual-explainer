---
name: generate-video
description: Generate a narrated MP4 explainer, or record a walkthrough of a live web app
---

Load the visual-explainer skill and make a video of: $@

Read `./references/video.md`. If the request is to record a live web app, follow its tutorial section. Otherwise:

1. Gather the facts first. Every number in the narration comes from the source.
2. Write the script: scenes, then sentences. Each sentence changes the picture.
3. Build the deck, run `--stills`, read every PNG, and fix what you see.
4. Make voice clips only if a speech API key is set. Render the MP4 and report its path, length, and voice.
