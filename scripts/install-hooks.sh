#!/bin/bash

##############################################################################
# Install Git Hooks
#
# Автоматическая установка pre-commit hook для security checks
##############################################################################

echo "📦 Installing git hooks..."

# Проверить что scripts/security-check.sh существует
if [ ! -f "scripts/security-check.sh" ]; then
  echo "❌ Error: scripts/security-check.sh not found"
  exit 1
fi

# Создать pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Git Pre-commit Hook
# Runs security checks before every commit
# To bypass: git commit --no-verify

bash scripts/security-check.sh
EOF

# Сделать executable
chmod +x .git/hooks/pre-commit
chmod +x scripts/security-check.sh

echo "✅ Git hooks installed successfully!"
echo ""
echo "Pre-commit hook will now run automatically before every commit."
echo "To bypass (not recommended): git commit --no-verify"
