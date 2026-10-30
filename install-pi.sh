#!/bin/bash
# install-pi.sh - Install visual-explainer for Pi

set -e

SKILL_DIR="$HOME/.pi/agent/skills/visual-explainer"
PROMPTS_DIR="$HOME/.pi/agent/prompts"

# Check if we're in the repo or need to clone
if [ ! -f "plugins/visual-explainer/SKILL.md" ]; then
    echo "Cloning visual-explainer..."
    TEMP_DIR=$(mktemp -d)
    git clone --depth 1 https://github.com/nicobailon/visual-explainer.git "$TEMP_DIR"
    cd "$TEMP_DIR"
    CLEANUP=true
else
    CLEANUP=false
fi

# Copy skill
echo "Installing skill to $SKILL_DIR..."
mkdir -p "$(dirname "$SKILL_DIR")"
rm -rf "$SKILL_DIR"
cp -r plugins/visual-explainer "$SKILL_DIR"

# Copy prompts (slash commands)
echo "Installing prompts to $PROMPTS_DIR..."
mkdir -p "$PROMPTS_DIR"
rm -f "$PROMPTS_DIR"/s[h]are*.md
cp "$SKILL_DIR/commands/"*.md "$PROMPTS_DIR/"

# Cleanup if we cloned
if [ "$CLEANUP" = true ]; then
    rm -rf "$TEMP_DIR"
fi

echo ""
echo "Done! Restart pi to use visual-explainer."
echo ""
echo "Commands available:"
echo "  /diff-review, /plan-review, /project-recap, /compare, /fact-check, /state-machine"
echo "  /generate-web-diagram, /generate-slides, /generate-video, /generate-visual-plan"
echo ""
echo "Note: this legacy installer copies only skills and prompts. Use 'pi install' for the native Pi tool."
