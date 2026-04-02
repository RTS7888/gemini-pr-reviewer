# Gemini PR Reviewer

An automated GitHub Pull Request review system powered by Google Gemini AI. This GitHub Action acts as a senior developer, reviewing PRs automatically and posting detailed, actionable comments on your code.

## Features

- **Comprehensive Code Review**: Analyzes code across 6 key dimensions:
  - Correctness & Logic
  - Security vulnerabilities
  - Performance optimization
  - Code Quality & Style
  - Error Handling
  - Testing considerations

- **Smart Comment Placement**: Posts inline comments on specific lines of code with context-aware suggestions

- **Configurable Severity Levels**: Filter comments by severity (critical, high, medium, low, info)

- **Large Context Support**: Leverages Gemini 1.5 Pro's large context window for comprehensive analysis

- **Constructive Feedback**: Educational and actionable review comments with specific suggestions

## Setup Instructions

### 1. Get Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for the next step

### 2. Configure GitHub Repository Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `GITHUB_TOKEN`: (Usually already available) GitHub token with `pull_requests: write` permissions

### 3. Add Workflow to Your Repository

Create a new file `.github/workflows/pr-review.yml` in your repository with the following content:

```yaml
name: 'AI PR Review'

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true
        type: number

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: AI PR Review
        uses: your-username/gemini-pr-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          max-comments: '15'
          min-severity: 'medium'
```

### 4. Configuration Options

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `github-token` | GitHub token for API access | - | ✅ |
| `gemini-api-key` | Google Gemini API key | - | ✅ |
| `max-comments` | Maximum number of comments to post | `10` | ❌ |
| `min-severity` | Minimum severity level (critical, high, medium, low, info) | `medium` | ❌ |

## Usage Examples

### Basic Setup
```yaml
- name: AI PR Review
  uses: your-username/gemini-pr-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
```

### Strict Review (All Issues)
```yaml
- name: AI PR Review
  uses: your-username/gemini-pr-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    min-severity: 'low'
    max-comments: '25'
```

### Critical Issues Only
```yaml
- name: AI PR Review
  uses: your-username/gemini-pr-reviewer@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    min-severity: 'critical'
    max-comments: '5'
```

## Review Criteria

The AI reviewer analyzes your code based on these comprehensive criteria:

### 🔍 Correctness & Logic
- Logical flaws and edge cases
- Algorithm correctness
- Business logic implementation
- Data flow and state management

### 🔒 Security
- SQL injection, XSS, CSRF vulnerabilities
- Hardcoded secrets and API keys
- Input validation and sanitization
- Authentication/authorization flaws

### ⚡ Performance
- Inefficient algorithms
- Unnecessary API calls
- Memory leaks and resource management
- Caching opportunities

### 🎨 Code Quality & Style
- Clean Code principles
- Naming conventions
- DRY and SOLID principles
- Code organization

### 🛡️ Error Handling
- Exception handling
- Error messages and logging
- Input validation
- Edge case coverage

### 🧪 Testing
- Testability assessment
- Missing edge cases
- Test coverage suggestions
- Mocking strategies

## Output Format

The action provides two types of feedback:

### 1. Inline Comments
Precise line-specific comments with:
- 🚨 Severity indicators
- 🐛 Issue type classification
- 💡 Specific suggestions
- 📝 Detailed explanations

### 2. Summary Review
Overall PR assessment including:
- 📊 Issue count by severity
- 🎯 Overall assessment
- ⚠️ Critical issue highlights
- ✅ Approval or request changes

## Development

### Building the Action
```bash
npm install
npm run build
npm run package
```

### Testing
```bash
npm test
npm run lint
```

### Local Development
```bash
# Install dependencies
npm install

# Build the action
npm run build

# Test locally (requires GitHub token and Gemini API key)
export GITHUB_TOKEN=your_token
export GEMINI_API_KEY=your_api_key
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security Considerations

- API keys are stored as GitHub repository secrets
- The action only requires `pull_requests: write` permissions
- No code is sent to external services except Google Gemini API
- All API calls are made over HTTPS

## Troubleshooting

### Common Issues

**"Failed to fetch PR context"**
- Ensure `GITHUB_TOKEN` has proper permissions
- Check if the PR number is correct

**"Gemini API error"**
- Verify your `GEMINI_API_KEY` is valid
- Check if you have exceeded API quotas

**"No comments posted"**
- Check if `min-severity` is too restrictive
- Verify there are actual code changes in the PR

### Debug Mode
Add this step to your workflow for debugging:
```yaml
- name: Debug
  run: |
    echo "PR Number: ${{ github.event.number }}"
    echo "Repository: ${{ github.repository }}"
    echo "Ref: ${{ github.ref }}"
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 Report bugs: [GitHub Issues](https://github.com/your-username/gemini-pr-reviewer/issues)
- 💡 Feature requests: [GitHub Discussions](https://github.com/your-username/gemini-pr-reviewer/discussions)
- 📧 Questions: Open an issue

---

*This action uses Google Gemini AI for code review. Please review Google's terms of service and privacy policy.*
