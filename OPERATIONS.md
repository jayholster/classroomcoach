# Classroom Coach — Operations Guide

How to run, configure, and monitor a deployment. No developer intervention is
needed for anything described here.

## Environments

Three environments are supported, distinguished by configuration only — the
same build runs in each.

| Setting | Purpose |
| --- | --- |
| `VITE_APP_ENVIRONMENT` | `development`, `staging`, or `production`. Non-production shows a banner. |
| `VITE_APP_RELEASE` / `APP_RELEASE` | Build identifier recorded on sessions, versions, and events. |
| `VITE_APP_URL` / `APP_URL` | Public address, used in invitations and sign-in links. |
| `VITE_SUPPORT_EMAIL` | Shown to people who need help. |
| `LOVABLE_API_KEY` | Credential for the default model provider. |
| `EXTERNAL_MODEL_API_KEY` | Credential for a self-hosted or university endpoint. |

Server-side values are read inside request handlers, never at module load, so
changing configuration takes effect without a rebuild.

## Model configuration

Administrators change the active model on the Assurance page. Each
configuration records:

- provider type and model identifier;
- timeout, retry limit, and concurrency limit;
- input and output cost per million tokens, used for the cost estimates;
- a configuration version, stamped on every call for later comparison;
- a credential *reference name* only — never a credential value.

Changing the active configuration is written to the audit trail and does not
affect already-published versions, which keep the model and foundation they
were built with.

## What happens when the model fails

Every AI call goes through one gateway. On failure the gateway:

1. retries transient failures with backoff, up to the configured limit;
2. makes at most one repair attempt when the response is not valid structured
   output;
3. records the attempt, latency, tokens, and error class in `model_usage_events`;
4. returns a plain-language error to the person.

Nothing is written to the rehearsal until a valid response exists, so a failed
turn leaves the session exactly as it was and can simply be tried again.

## Monitoring

The Assurance page shows, for administrators:

- **System health** — environment, release, foundation version, active model,
  and whether each required piece of configuration is present.
- **Model reliability (24h)** — call count, failure count, auto-repairs,
  median and 95th-percentile latency, estimated cost.
- **Usage over time** — daily calls, failures, tokens, and estimated spend.
- **Audit trail** — who created, published, archived, uploaded, or reconfigured.

Structured JSON lines are also written to the hosting logs, one per model call,
turn commit, or audit failure. Filter by `kind` and `outcome`.

## Routine tasks

- **A rehearsal looks stuck.** Turns are committed atomically; a partial turn
  cannot exist. Ask the person to reload — the transcript is the source of truth.
- **A document will not process.** Its status shows `Failed` with the reason.
  Delete and re-upload, or upload plain text. Limits: 15 MB, and plain text,
  Markdown, PDF, or Word.
- **Costs are climbing.** Check *Usage over time*, then lower the active
  configuration's concurrency limit or switch to a cheaper model.
- **An educator flags a response.** The flag appears under *Flagged moments*
  with a "Re-run this moment" action. Re-running never alters the recorded
  event log.

## Testing

`bun run test` runs the unit suite. `bunx tsgo --noEmit` type-checks the
application.
