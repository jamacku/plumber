import { CommitObject } from '../../../../../src/pull-request/commits/commit/commit';
import { Commit } from '../../../../../src/pull-request/commits/commit/commit.model';

describe('Commits Object', () => {
  let commits: Commit[];

  beforeEach(() => {
    const data: CommitObject[] = [
      {
        sha: '57d7b394a91f1d2a69afab18b810ec3084eb7583',
        message: 'Test title\nTest message',
      },
      {
        sha: '57d7b394a91f1d2a69afab18b810ec3084eb7583',
        message: 'Test title\nTest message',
        title: 'Test message',
        bugRef: '123456789',
        rhelOnly: false,
        upstreamRef: '57d7b394a91f1d2a69afab18b810ec3084eb7583',
      },
    ];

    commits = data.map(item => new Commit(item));
  });

  it('can be instantiated', () => {
    commits.map(item => expect(item).toBeDefined());
  });

  // it('can correctly decompose title', () => {
  //   const expectedTitles = ['An Issue 1', 'An Issue 2', 'An Issue 3'];
  //   const expectedBugRefs = [123456, NaN, 123456];

  //   issue.map((item, index) =>
  //     expect(item.title).toEqual({
  //       name: expectedTitles[index],
  //       bugRef: expectedBugRefs[index],
  //     })
  //   );
  // });
});
