Create a GitHub pull request for the tolk-adversary project following the project's conventions.

## PR format

**Title:** a single Conventional Commits line. PRs are squash-merged and the title
becomes the commit on `main`, and the CHANGELOG is built from those commits.

- `feat(model): resolve generic wrapper unions`
- `fix(abi): tolerate unknown type kinds`
- `ci: add the test matrix`
- `docs: describe the ABI model`

Scopes: `abi`, `model`, `cli`, `gen`, plus `ci`, `docs`, `chore`. `!` after the
type marks a breaking change.

**Body:** short — the details are in the issue.

```
Closes #N

- What changed, one line per key change
- How it was tested
```

## Steps

1. `git log main..HEAD --oneline` and `git diff main...HEAD -- . ':(exclude)package-lock.json'` to review the change.
2. Identify the issue it closes (ask the user if not clear).
3. Push the branch: `git push -u origin <branch>`.
4. Create the PR with the issue's labels and assignee:

```sh
gh pr create \
  --title "feat(model): short description" \
  --label "enhancement" \
  --assignee "StanislavKozachenko" \
  --body "$(cat <<'EOF'
Closes #N

- Key change
- Tests: what they cover
EOF
)"
```

5. Wait for CI: `gh pr checks <n> --watch`. When `CI ok` is green, squash-merge:
   `gh pr merge <n> --squash --delete-branch`. If a check fails, read its log and
   fix the cause first.
6. Sync: `git checkout main && git pull --ff-only`.
7. Report the PR URL.

## Rules

- `Closes #N` goes only in the PR body, never in commit messages.
- Commit messages are one line, no body, no co-author trailers.
- No AI attribution anywhere.
- Commits are signed; never bypass signing.
- One change per branch, issue and PR; branch from an up-to-date `main`.
