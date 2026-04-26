---
name: share
description: Share a visual explainer HTML page via Vercel and return a live URL
---
Share the HTML file at `$1` via Vercel. Run `bash {{skill_dir}}/scripts/share.sh "$1"` and display the live URL and claim URL returned by the script.

If `$1` is not provided, list HTML files in `~/.agent/diagrams/` and ask the user to select one.

The deployment is public — anyone with the URL can view the file. The vercel-deploy skill must be installed (`pi install npm:vercel-deploy`). No Vercel account or API keys are required; deployments are claimable after the fact.
