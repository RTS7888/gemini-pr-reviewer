# Deploy Gemini PR Reviewer Action

## Step 1: Create New Repository
1. Go to GitHub and create a new repository called `gemini-pr-reviewer`
2. Make it public (for easier use)

## Step 2: Clone and Setup
```bash
# Clone the new repository
git clone https://github.com/YOUR_USERNAME/gemini-pr-reviewer.git
cd gemini-pr-reviewer

# Copy only the action files (exclude Angular files)
cp -r "/Users/atharva/Desktop/AI MVP/PR REVIEWER"/* .

# Remove any Angular-specific files if they exist
rm -rf src/app/  # Remove Angular app files
rm -f angular.json package-lock.json  # Remove Angular config
```

## Step 3: Install and Build
```bash
npm install
npm run build
npm run package
```

## Step 4: Commit and Push
```bash
git add .
git commit -m "Initial commit: Gemini PR Reviewer Action"
git push origin main
```

## Step 5: Add Repository Secret
1. Go to the `gemini-pr-reviewer` repository on GitHub
2. Settings → Secrets and variables → Actions
3. Add secret: `GEMINI_API_KEY`
4. Value: Your Gemini API key

## Step 6: Test the Action
1. Create a test PR in the `gemini-pr-reviewer` repository
2. The workflow should trigger automatically
3. Check Actions tab for results

## Step 7: Use in Other Repositories
Once published, use it in any repository:

```yaml
- name: AI PR Review
  uses: YOUR_USERNAME/gemini-pr-reviewer@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
```

## Files to Include
✅ action.yml
✅ package.json
✅ tsconfig.json
✅ src/index.ts
✅ src/utils/github-client.ts
✅ src/utils/gemini-client.ts
✅ src/types/index.ts
✅ src/prompts/system-prompt.ts
✅ .github/workflows/pr-review.yml
✅ README.md
✅ LICENSE
✅ .gitignore

## Files to Exclude
❌ Angular app files (src/app/)
❌ Angular configuration (angular.json)
❌ Portfolio-specific files
