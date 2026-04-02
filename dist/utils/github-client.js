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
exports.GitHubClient = void 0;
const github = __importStar(require("@actions/github"));
class GitHubClient {
    constructor(token) {
        this.octokit = github.getOctokit(token);
    }
    async getPRContext(owner, repo, prNumber) {
        try {
            const [pr, files] = await Promise.all([
                this.octokit.rest.pulls.get({
                    owner,
                    repo,
                    pull_number: prNumber,
                }),
                this.octokit.rest.pulls.listFiles({
                    owner,
                    repo,
                    pull_number: prNumber,
                }),
            ]);
            const changedFiles = files.data.map((file) => ({
                filename: file.filename,
                patch: file.patch || '',
                additions: file.additions,
                deletions: file.deletions,
            }));
            const diff = this.generateDiff(changedFiles);
            return {
                owner,
                repo,
                prNumber,
                title: pr.data.title,
                description: pr.data.body || '',
                diff,
                changedFiles,
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch PR context: ${error}`);
        }
    }
    generateDiff(files) {
        return files
            .filter((file) => file.patch)
            .map((file) => `--- a/${file.filename}\n+++ b/${file.filename}\n${file.patch}`)
            .join('\n\n');
    }
    async createReviewComment(owner, repo, prNumber, comment) {
        try {
            return await this.octokit.rest.pulls.createReviewComment({
                owner,
                repo,
                pull_number: prNumber,
                body: comment.body,
                path: comment.path,
                line: comment.line,
            });
        }
        catch (error) {
            throw new Error(`Failed to create review comment: ${error}`);
        }
    }
    async createGeneralReview(owner, repo, prNumber, body, event = 'COMMENT') {
        try {
            return await this.octokit.rest.pulls.createReview({
                owner,
                repo,
                pull_number: prNumber,
                body,
                event,
            });
        }
        catch (error) {
            throw new Error(`Failed to create general review: ${error}`);
        }
    }
    async getCommitSha(owner, repo, prNumber) {
        try {
            const pr = await this.octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber,
            });
            return pr.data.head.sha;
        }
        catch (error) {
            throw new Error(`Failed to get commit SHA: ${error}`);
        }
    }
}
exports.GitHubClient = GitHubClient;
