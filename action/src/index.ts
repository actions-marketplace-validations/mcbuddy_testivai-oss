/**
 * Main entry point for TestivAI GitHub Action
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as artifact from '@actions/artifact';
import * as fs from 'fs';
import * as path from 'path';
import { buildComment, buildEmptyComment } from './comment';
import { determineStatus, STATUS_CONTEXT } from './status';
import { ResultsData, SnapshotImageUrls } from './types';

/**
 * Recursively collect all file paths under a directory.
 * Used so the artifact upload includes visual-report/images/ subdirectories.
 */
function collectFilesRecursively(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? collectFilesRecursively(fullPath) : [fullPath];
  });
}

/**
 * Upload a single PNG file to GitHub's issue asset endpoint.
 *
 * GitHub's web UI uses https://uploads.github.com/repos/{owner}/{repo}/issues/{number}/assets
 * to attach drag-dropped images to issues/PRs. The returned `contentUrl` is a
 * publicly-embeddable `github.com/user-attachments/assets/{uuid}` URL.
 *
 * Fails silently (returns null) — callers degrade to text-only comments.
 */
async function uploadImageAsset(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  imagePath: string,
  filename: string,
): Promise<string | null> {
  try {
    if (!fs.existsSync(imagePath)) return null;
    const imageBuffer = fs.readFileSync(imagePath);

    const url = `https://uploads.github.com/repos/${owner}/${repo}/issues/${prNumber}/assets`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; name="${filename}"; filename="${filename}"`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      core.info(`Image upload failed for ${filename}: HTTP ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      return null;
    }

    const data = await response.json() as { contentUrl?: string; url?: string };
    const resultUrl = data.contentUrl ?? data.url ?? null;
    if (!resultUrl) {
      core.info(`Image upload for ${filename}: no URL in response — keys: ${Object.keys(data).join(', ')}`);
    }
    return resultUrl;
  } catch (err) {
    core.info(`Image upload error for ${filename}: ${err}`);
    return null;
  }
}

/**
 * Upload baseline, current, and diff PNGs for every changed snapshot.
 * Paths are resolved from results.json relative to reportDir.
 *
 * Returns a Map of snapshot name → { baseline?, current?, diff? }.
 * Missing or failed uploads are simply omitted from the map entry.
 */
async function uploadSnapshotImages(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  reportDir: string,
  results: ResultsData,
): Promise<Map<string, SnapshotImageUrls>> {
  const imageMap = new Map<string, SnapshotImageUrls>();
  const changedSnapshots = results.snapshots.filter(s => s.status === 'changed');

  for (const snapshot of changedSnapshots) {
    const images: SnapshotImageUrls = {};
    const slug = snapshot.name.replace(/[^a-z0-9_-]/gi, '-');

    if (snapshot.baselinePath) {
      images.baseline = await uploadImageAsset(
        token, owner, repo, prNumber,
        path.join(reportDir, snapshot.baselinePath),
        `${slug}-baseline.png`,
      ) ?? undefined;
    }
    if (snapshot.currentPath) {
      images.current = await uploadImageAsset(
        token, owner, repo, prNumber,
        path.join(reportDir, snapshot.currentPath),
        `${slug}-current.png`,
      ) ?? undefined;
    }
    if (snapshot.diffPath) {
      images.diff = await uploadImageAsset(
        token, owner, repo, prNumber,
        path.join(reportDir, snapshot.diffPath),
        `${slug}-diff.png`,
      ) ?? undefined;
    }

    if (images.baseline || images.current || images.diff) {
      imageMap.set(snapshot.name, images);
    }
  }

  return imageMap;
}

async function run(): Promise<void> {
  try {
    // Read inputs
    const token = core.getInput('github-token', { required: true });
    const reportDir = core.getInput('report-dir', { required: true });
    const failOnDiff = core.getBooleanInput('fail-on-diff');
    const uploadArtifact = core.getBooleanInput('upload-artifact');
    const artifactRetentionDays = parseInt(core.getInput('artifact-retention-days'), 10);
    const embedImages = core.getBooleanInput('embed-images');

    core.info(`Reading results from ${reportDir}...`);

    // Read results.json
    const resultsPath = path.join(reportDir, 'results.json');
    if (!fs.existsSync(resultsPath)) {
      core.setFailed(`results.json not found at ${resultsPath}. Did the tests run?`);
      return;
    }

    const results: ResultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    // Upload artifact if enabled (recursive so images/ subdirectory is included)
    if (uploadArtifact) {
      const artifactClient = new artifact.DefaultArtifactClient();
      const artifactName = 'testivai-visual-report';
      const files = collectFilesRecursively(reportDir);

      await artifactClient.uploadArtifact(
        artifactName,
        files,
        reportDir,
        { retentionDays: artifactRetentionDays },
      );

      core.info(`Uploaded ${files.length} files as artifact '${artifactName}'`);
    }

    // Get GitHub context
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only post comment on PRs
    if (context.eventName === 'pull_request' && context.payload.pull_request) {
      const prNumber = context.payload.pull_request.number;

      // Upload diff images to GitHub CDN (used to embed inline in the comment)
      let imageUrls: Map<string, SnapshotImageUrls> | undefined;
      if (embedImages && results.summary.changed > 0) {
        core.info('Uploading diff images for PR comment...');
        imageUrls = await uploadSnapshotImages(
          token,
          context.repo.owner,
          context.repo.repo,
          prNumber,
          reportDir,
          results,
        );
        const uploaded = imageUrls.size;
        if (uploaded > 0) {
          core.info(`Uploaded images for ${uploaded} changed snapshot(s)`);
        } else {
          core.info('Image upload returned no URLs — comment will be text-only');
        }
      }

      const { data: comments } = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
      });

      // Build comment (with images if available)
      const commentBody = results.snapshots.length === 0
        ? buildEmptyComment()
        : buildComment(results, imageUrls);

      // Look for existing comment to upsert
      const existingComment = comments.find(c =>
        c.body?.includes('<!-- testivai-visual-report -->')
      );

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
        core.info('Updated existing PR comment');
      } else {
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          body: commentBody,
        });
        core.info('Created new PR comment');
      }
    } else {
      core.info('Not a PR event, skipping comment');
    }

    // Post commit status
    const status = determineStatus(results, { failOnDiff });
    const sha = context.payload.pull_request?.head.sha || context.sha;

    await octokit.rest.repos.createCommitStatus({
      owner: context.repo.owner,
      repo: context.repo.repo,
      sha,
      state: status.state,
      context: STATUS_CONTEXT,
      description: status.description,
    });

    core.info(`Set commit status: ${status.state} - ${status.description}`);

    // Fail workflow if needed
    if (status.state === 'failure') {
      core.setFailed(`Visual regression detected: ${status.description}`);
    } else if (results.summary.changed > 0 || results.summary.newSnapshots > 0) {
      core.warning(`Visual changes found: ${results.summary.changed} changed, ${results.summary.newSnapshots} new`);
    } else {
      core.info('All visual snapshots passed!');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

run();
