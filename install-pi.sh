#!/bin/bash
# install-pi.sh - Install my-visual-explainer for Pi

set -e

SKILL_DIR="$HOME/.pi/agent/skills/my-visual-explainer"
PROMPTS_DIR="$HOME/.pi/agent/prompts"

# Check if we're in the repo or need to clone
if [ ! -f "plugins/my-visual-explainer/SKILL.md" ]; then
    echo "Cloning my-visual-explainer..."
    TEMP_DIR=$(mktemp -d)
    git clone --depth 1 https://github.com/jccidc/my-visual-explainer.git "$TEMP_DIR"
    cd "$TEMP_DIR"
    CLEANUP=true
else
    CLEANUP=false
fi

# Copy skill
echo "Installing skill to $SKILL_DIR..."
rm -rf "$SKILL_DIR"
cp -r plugins/my-visual-explainer "$SKILL_DIR"

# Replace {{skill_dir}} with actual path
echo "Patching paths..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    find "$SKILL_DIR" -name "*.md" -exec sed -i '' "s|{{skill_dir}}|$SKILL_DIR|g" {} \;
else
    find "$SKILL_DIR" -name "*.md" -exec sed -i "s|{{skill_dir}}|$SKILL_DIR|g" {} \;
fi

# Copy prompts (slash commands)
echo "Installing prompts to $PROMPTS_DIR..."
mkdir -p "$PROMPTS_DIR"
cp "$SKILL_DIR/commands/"*.md "$PROMPTS_DIR/"

# Cleanup if we cloned
if [ "$CLEANUP" = true ]; then
    rm -rf "$TEMP_DIR"
fi

echo ""
echo "Done! Restart pi to use my-visual-explainer."
echo ""
echo "Commands available:"
echo "  /diff-review, /plan-review, /project-recap, /fact-check"
echo "  /generate-web-diagram, /generate-slides, /generate-visual-plan"
echo "  /share"
