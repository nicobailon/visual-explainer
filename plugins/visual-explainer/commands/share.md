---
name: share
description: Share a visual explainer HTML page via Vercel and return a live URL
---
Share the HTML file at `$1` using the visual-explainer share script.

Run: `bash {{skill_dir}}/scripts/share.sh $1`

The script copies the file to a temp directory as `index.html`, deploys it via the vercel-deploy skill, and prints the live URL. No Vercel account or API keys are needed — the deployment is publicly accessible and claimable.

If no file path is provided, list HTML files in `~/.agent/diagrams/` and ask the user to select one.

Report the live URL and claim URL to the user when the deployment succeeds.
