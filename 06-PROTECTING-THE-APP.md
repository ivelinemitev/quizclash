# 06 --- Cluster F: Protecting the App (Optional / Timeboxed)

## Course context

This cluster is marked optional in the supplied path. Implement only the
highest-value protections that fit the 2--3 day timebox.

## Priority 1 --- Rate limiting

Apply a rate limit to the busiest public write route, preferably: -
create game; or - join game; or - answer submission if the platform
integration is appropriate.

Demonstrate that repeated requests eventually receive `429`.

Document the chosen production window/count rationale.

## Priority 2 --- Structured audit logging

Emit parseable structured audit events for important mutations.

Minimum fields: - actor/player identifier or nickname; - action; -
target room/game; - timestamp; - outcome.

Ensure production logs can be filtered for audit events.

## Priority 3 --- Turnstile

If time remains, protect a public form such as Create Game with
Turnstile and verify the token server-side.

Do not add intrusive CAPTCHA UX.

## AI Gateway

Only add AI Gateway if it can be done quickly and cleanly. If used,
place it in front of model calls for observability/rate/spend control.

## Secret rotation drill

If the project introduces a shared secret, document or perform a safe
dual-key rotation sequence: 1. consumer accepts old + new; 2. deploy
consumer; 3. producer switches to new; 4. verify; 5. retire old.

Do not invent a secret solely to perform this exercise.

## Acceptance criteria

Minimum for this timeboxed project: - one meaningful rate limit; -
structured audit logs for core mutations; - secrets are not committed.

Turnstile, AI Gateway, and a full rotation drill are optional if they do
not naturally fit the implementation.
