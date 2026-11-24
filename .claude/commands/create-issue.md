Create a GitHub issue for the tolk-adversary project following the project's conventions.

## Issue format

- **Title:** short and descriptive (not a Conventional Commits line — that is for PRs).
- **Body:** the problem or task, and a short checklist of what "done" looks like.
- Always set `--label` and `--assignee StanislavKozachenko`.

Labels in use: `bug`, `enhancement`, `tooling`, `documentation`, `dependencies`.

## Steps

```sh
gh issue create \
  --title "Short descriptive title" \
  --label "enhancement" \
  --assignee "StanislavKozachenko" \
  --body "$(cat <<'EOF'
What and why.

- done criterion
- done criterion
EOF
)"
```

One issue per change. The branch and PR that follow close exactly this issue.
