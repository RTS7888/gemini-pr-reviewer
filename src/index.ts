import * as core from '@actions/core';
import { GitHubClient } from './utils/github-client';
import { GeminiClient } from './utils/gemini-client';
import { ReviewComment } from './types';

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const maxComments = parseInt(core.getInput('max-comments') || '10');
    const minSeverity = core.getInput('min-severity') || 'medium';

    // Get PR context from environment
    const owner = core.getInput('owner') || process.env.GITHUB_REPOSITORY_OWNER!;
    const repo = core.getInput('repo') || process.env.GITHUB_REPOSITORY?.split('/')[1]!;
    const prNumber = parseInt(core.getInput('pr-number') || process.env.GITHUB_REF?.split('/')[2]!);

    if (!owner || !repo || !prNumber) {
      throw new Error('Missing required repository or PR information');
    }

    core.info(`Processing PR #${prNumber} in ${owner}/${repo}`);

    // Initialize clients
    const githubClient = new GitHubClient(githubToken);
    const geminiClient = new GeminiClient(geminiApiKey);

    // Get PR context
    const prContext = await githubClient.getPRContext(owner, repo, prNumber);
    core.info(`Found ${prContext.changedFiles.length} changed files`);

    // Skip if no code changes
    if (prContext.changedFiles.length === 0) {
      core.info('No code changes found, skipping review');
      return;
    }

    // Get AI review
    core.info('Sending code to Gemini for review...');
    const review = await geminiClient.reviewCode(
      prContext.diff,
      prContext.title,
      prContext.description
    );

    core.info(`Gemini returned ${review.comments.length} comments`);

    // Filter comments by severity and limit
    const filteredComments = filterComments(review.comments, minSeverity, maxComments);
    core.info(`Posting ${filteredComments.length} comments after filtering`);

    // Post comments
    await postComments(githubClient, owner, repo, prNumber, filteredComments, review);

    // Create summary review
    await createSummaryReview(githubClient, owner, repo, prNumber, review);

    core.info('PR review completed successfully');

  } catch (error) {
    core.setFailed(`Action failed: ${error}`);
  }
}

function filterComments(
  comments: ReviewComment[],
  minSeverity: string,
  maxComments: number
): ReviewComment[] {
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const minIndex = severityOrder.indexOf(minSeverity);
  
  return comments
    .filter(comment => severityOrder.indexOf(comment.severity) <= minIndex)
    .slice(0, maxComments);
}

async function postComments(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  comments: ReviewComment[],
  review: any
): Promise<void> {
  const commentPromises = comments.map(async (comment) => {
    try {
      const commentBody = formatCommentBody(comment);
      await githubClient.createReviewComment(owner, repo, prNumber, {
        body: commentBody,
        path: comment.file,
        line: comment.line,
      });
    } catch (error) {
      core.warning(`Failed to post comment on ${comment.file}:${comment.line}: ${error}`);
    }
  });

  await Promise.allSettled(commentPromises);
}

function formatCommentBody(comment: ReviewComment): string {
  const severityEmoji = getSeverityEmoji(comment.severity);
  const typeEmoji = getTypeEmoji(comment.type);
  
  let body = `${severityEmoji} ${typeEmoji} **${comment.title}**\n\n`;
  body += `${comment.description}\n\n`;
  
  if (comment.suggestion) {
    body += `💡 **Suggestion:** ${comment.suggestion}\n\n`;
  }
  
  body += `*Severity: ${comment.severity} | Type: ${comment.type}*`;
  
  return body;
}

function getSeverityEmoji(severity: string): string {
  const emojis = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: '💡',
    info: 'ℹ️',
  };
  return emojis[severity as keyof typeof emojis] || 'ℹ️';
}

function getTypeEmoji(type: string): string {
  const emojis = {
    issue: '🐛',
    suggestion: '💭',
    praise: '👍',
  };
  return emojis[type as keyof typeof emojis] || '💭';
}

async function createSummaryReview(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  review: any
): Promise<void> {
  const severityEmoji = getSeverityEmoji(review.severity);
  let summary = `${severityEmoji} **AI Code Review Summary**\n\n`;
  summary += `**Overall Assessment:** ${review.summary}\n\n`;
  
  const commentCounts = review.comments.reduce((acc: any, comment: ReviewComment) => {
    acc[comment.severity] = (acc[comment.severity] || 0) + 1;
    return acc;
  }, {});
  
  if (Object.keys(commentCounts).length > 0) {
    summary += '**Issues Found:**\n';
    Object.entries(commentCounts)
      .sort(([a], [b]) => {
        const order = ['critical', 'high', 'medium', 'low', 'info'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .forEach(([severity, count]) => {
        const emoji = getSeverityEmoji(severity);
        summary += `- ${emoji} ${severity}: ${count}\n`;
      });
  }
  
  summary += '\n---\n*This review was generated by Gemini AI PR Reviewer*';

  // Determine review event based on severity
  let event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT';
  if (review.severity === 'critical' || review.severity === 'high') {
    event = 'REQUEST_CHANGES';
  }

  await githubClient.createGeneralReview(owner, repo, prNumber, summary, event);
}

// Run the action
if (require.main === module) {
  run();
}

export { run };
