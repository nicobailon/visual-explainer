#!/bin/bash
# install-pi.sh - Install visual-explainer for Pi

set -e

SKILLS_DIR="$HOME/.pi/agent/skills"
SKILL_DIR="$SKILLS_DIR/visual-explainer"
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

# Copy user-invoked command wrapper skills alongside the main skill. The
# wrappers stay out of model prompts via disable-model-invocation frontmatter,
# but remain available in harnesses that expose skills rather than commands.
echo "Installing command wrapper skills to $SKILLS_DIR..."
for wrapper in "$SKILL_DIR"/skills/*; do
    if [ -d "$wrapper" ]; then
        name="$(basename "$wrapper")"
        rm -rf "$SKILLS_DIR/$name"
        cp -r "$wrapper" "$SKILLS_DIR/$name"
    fi
done

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
echo "User-invoked command skills available:"
echo "  diff-review, plan-review, project-recap, fact-check"
echo "  generate-web-diagram, generate-slides, generate-visual-plan"
echo ""
echo "Prompt commands also available when supported:"
echo "  /diff-review, /plan-review, /project-recap, /fact-check"
echo "  /generate-web-diagram, /generate-slides, /generate-visual-plan"
echo ""
echo "Note: this legacy installer copies only skills and prompts. Use 'pi install' for the native Pi tool."
