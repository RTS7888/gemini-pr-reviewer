"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const core = __importStar(require("@actions/core"));
const github_client_1 = require("./utils/github-client");
const gemini_client_1 = require("./utils/gemini-client");
async function run() {
    try {
        // Get inputs
        const githubToken = core.getInput('github-token', { required: true });
        const geminiApiKey = core.getInput('gemini-api-key', { required: true });
        const maxComments = parseInt(core.getInput('max-comments') || '10');
        const minSeverity = core.getInput('min-severity') || 'medium';
        // Get PR context from environment
        const owner = core.getInput('owner') || process.env.GITHUB_REPOSITORY_OWNER;
        const repo = core.getInput('repo') || process.env.GITHUB_REPOSITORY?.split('/')[1];
        const prNumber = parseInt(core.getInput('pr-number') || process.env.GITHUB_REF?.split('/')[2]);
        if (!owner || !repo || !prNumber) {
            throw new Error('Missing required repository or PR information');
        }
        core.info(`Processing PR #${prNumber} in ${owner}/${repo}`);
        // Initialize clients
        const githubClient = new github_client_1.GitHubClient(githubToken);
        const geminiClient = new gemini_client_1.GeminiClient(geminiApiKey);
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
        const review = await geminiClient.reviewCode(prContext.diff, prContext.title, prContext.description);
        core.info(`Gemini returned ${review.comments.length} comments`);
        // Filter comments by severity and limit
        const filteredComments = filterComments(review.comments, minSeverity, maxComments);
        core.info(`Posting ${filteredComments.length} comments after filtering`);
        // Post comments
        await postComments(githubClient, owner, repo, prNumber, filteredComments, review);
        // Create summary review
        await createSummaryReview(githubClient, owner, repo, prNumber, review);
        core.info('PR review completed successfully');
    }
    catch (error) {
        core.setFailed(`Action failed: ${error}`);
    }
}
function filterComments(comments, minSeverity, maxComments) {
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    const minIndex = severityOrder.indexOf(minSeverity);
    return comments
        .filter(comment => severityOrder.indexOf(comment.severity) <= minIndex)
        .slice(0, maxComments);
}
async function postComments(githubClient, owner, repo, prNumber, comments, review) {
    const commentPromises = comments.map(async (comment) => {
        try {
            const commentBody = formatCommentBody(comment);
            await githubClient.createReviewComment(owner, repo, prNumber, {
                body: commentBody,
                path: comment.file,
                line: comment.line,
            });
        }
        catch (error) {
            core.warning(`Failed to post comment on ${comment.file}:${comment.line}: ${error}`);
        }
    });
    await Promise.allSettled(commentPromises);
}
function formatCommentBody(comment) {
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
function getSeverityEmoji(severity) {
    const emojis = {
        critical: '🚨',
        high: '⚠️',
        medium: '⚡',
        low: '💡',
        info: 'ℹ️',
    };
    return emojis[severity] || 'ℹ️';
}
function getTypeEmoji(type) {
    const emojis = {
        issue: '🐛',
        suggestion: '💭',
        praise: '👍',
    };
    return emojis[type] || '💭';
}
async function createSummaryReview(githubClient, owner, repo, prNumber, review) {
    const severityEmoji = getSeverityEmoji(review.severity);
    let summary = `${severityEmoji} **AI Code Review Summary**\n\n`;
    summary += `**Overall Assessment:** ${review.summary}\n\n`;
    const commentCounts = review.comments.reduce((acc, comment) => {
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
    let event = 'COMMENT';
    if (review.severity === 'critical' || review.severity === 'high') {
        event = 'REQUEST_CHANGES';
    }
    await githubClient.createGeneralReview(owner, repo, prNumber, summary, event);
}
// Run the action
if (require.main === module) {
    run();
}
