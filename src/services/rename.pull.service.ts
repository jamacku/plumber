import { Context } from 'probot';
import metadata from 'probot-metadata';

import { Commit } from '../models/commit.model';
import { PullRequest } from '../models/pullRequest.model';

import { PullRequestObject } from '../types/pullRequest';

type CommitObject = {
  bugRef: string;
  sha: string;
  message: string;
};

export async function onSynchronize(context: Context) {
  // TODO: Find proper way to do this ( ... as any ) !!!
  const { payload }: { payload: any } = context;

  if (context.isBot) {
    return;
  }

  const commits: Commit[] = (
    await context.octokit.pulls.listCommits(context.pullRequest())
  ).data.map(commit => {
    const data = {
      sha: commit.sha,
      message: commit.commit.message,
    };

    return new Commit(data);
  });

  const pullRequestData: PullRequestObject = {
    id: payload.pull_request.id,
    title: payload.pull_request.title,
    body: payload.pull_request.body,
    assignee: payload.pull_request.assignee,
    milestone: payload.pull_request.milestone,
    project: payload.pull_request.project,
    commits,
  };

  const pr = new PullRequest(pullRequestData);

  // TODO: Rename PR
  const { bug, invalidCommits } = validateCommits(commits);

  if (bug) {
    const newTitle = `(${bug}) ${title}`;

    title !== newTitle &&
      context.octokit.pulls.update(
        context.pullRequest({
          title: newTitle,
        })
      );

    // remove needs-bz if it's set
  } else {
    // Set needs-bz label if it isn't set
    context.octokit.issues.addLabels(
      context.issue({
        labels: ['needs-bz'],
      })
    );
  }

  metadata(context).set('a', 'a');

  // TODO: consider to update existing comment or using check status instead of reviews
  if (invalidCommits.length) {
    const reviewComment = invalidBugReferenceTemplate(invalidCommits);

    // Update previous comment or create new

    context.octokit.pulls.createReview(
      context.pullRequest({
        event: 'COMMENT',
        body: reviewComment,
      })
    );
  } else {
    // clean previouse alerts...
  }
}

/**
 *
 * @param title
 * @returns
 */
export function isBuginTitle(title: string) {
  /* Regex '/^\s*\(\#?\d+\)/' check if PR title starts with bug reference e.g. (#123456) or (123456) */
  const bugRegex = /^\s*\(\#?\d+\)/;
  return bugRegex.test(title);
}

/**
 * Get list of commits for given PR
 * @param context
 * @returns
 */
async function getBugFromCommits(context: Context) {
  const bugRegex = /(^\s*|\n|\\n)(Resolves|Related): ?(#\d+)$/;

  let commits = (
    await context.octokit.pulls.listCommits(context.pullRequest())
  ).data.map(commit => {
    /* Transform recived object to contain only relevant informations */
    const commitDesc = {
      sha: commit.sha,
      message: commit.commit.message,
    };

    const result = commitDesc.message.match(bugRegex);
    return {
      ...commitDesc,
      bugRef: Array.isArray(result) ? result[3] : '',
    };
  });

  return commits;
}

/**
 *
 * @param commits
 * @returns
 */
function validateCommits(commits: CommitObject[]) {
  let bug: string = '';
  let invalidCommits = commits.filter(commit => {
    if (commit.bugRef && bug.length && commit.bugRef === bug) {
      return false; // Already noted bug reference
    } else if (commit.bugRef && !bug.length) {
      bug = commit.bugRef;
      return false; // First bug reference
    } else {
      return true; // Multiple bug references in one PR or no bug reference
    }
  });
  return { bug, invalidCommits };
}

function invalidBugReferenceTemplate(commits: CommitObject[]) {
  // Do not change following indentation
  const template = `⚠️ *Following commits are missing proper bugzilla reference!* ⚠️
---
  
${commits
  .map(commit => {
    let slicedMsg = commit.message.split(/\n/, 1)[0].slice(0, 70);
    const dotDot = '...';

    return slicedMsg.length < 70
      ? `\`\`${slicedMsg}\`\` - ${commit.sha}`
      : `\`\`${slicedMsg}${dotDot}\`\` - ${commit.sha}`;
  })
  .join('\r\n')}
  
---
Please ensure, that all commit messages includes i.e.: _Resolves: #123456789_ or _Related: #123456789_ and only **one** 🐞 is referenced per PR.`;

  return template;
}
