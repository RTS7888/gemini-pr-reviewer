import * as github from '@actions/github';
import { OctokitResponse } from '@octokit/types';
import { PRContext } from '../types';

export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
  }

  async getPRContext(owner: string, repo: string, prNumber: number): Promise<PRContext> {
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

      const changedFiles = files.data.map((file: any) => ({
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
    } catch (error) {
      throw new Error(`Failed to fetch PR context: ${error}`);
    }
  }

  private generateDiff(files: PRContext['changedFiles']): string {
    return files
      .filter((file: PRContext['changedFiles'][0]) => file.patch)
      .map((file: PRContext['changedFiles'][0]) => `--- a/${file.filename}\n+++ b/${file.filename}\n${file.patch}`)
      .join('\n\n');
  }

  async createReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    comment: {
      body: string;
      path: string;
      line: number;
    }
  ): Promise<OctokitResponse<any, number>> {
    try {
      return await this.octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body: comment.body,
        path: comment.path,
        line: comment.line,
      });
    } catch (error) {
      throw new Error(`Failed to create review comment: ${error}`);
    }
  }

  async createGeneralReview(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT'
  ): Promise<OctokitResponse<any, number>> {
    try {
      return await this.octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body,
        event,
      });
    } catch (error) {
      throw new Error(`Failed to create general review: ${error}`);
    }
  }

  async getCommitSha(owner: string, repo: string, prNumber: number): Promise<string> {
    try {
      const pr = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      return pr.data.head.sha;
    } catch (error) {
      throw new Error(`Failed to get commit SHA: ${error}`);
    }
  }
}
