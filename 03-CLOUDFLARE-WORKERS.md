# 03 --- Cluster C: Cloudflare Workers

## Course objective

Move the application from localhost to Cloudflare and understand the
Workers runtime rather than assuming Node.js.

## What to build

### 1. Deploy the current application to Cloudflare

Deploy the working Part 1 application before adding the remaining data
services.

### 2. Wrangler

Configure the project using current Wrangler conventions.

Demonstrate: - local development; - deployment; - secrets; - production
log/tail workflow.

### 3. Worker runtime exercise

Create the smallest useful Worker/runtime example required to
understand: - V8 isolates vs Node.js; - request/fetch handler
lifecycle; - work that may continue after a response (`ctx.waitUntil` or
the current equivalent).

Do not keep a pointless hello-world service in the final architecture if
it is not needed.

### 4. Workers AI binding smoke test

Add the AI binding and perform a minimal model call from the edge with
no public third-party API key.

This is only a smoke test in this phase. Full quiz generation belongs to
the storage/AI phase.

### 5. Compatibility review

Inspect dependencies for Worker-runtime incompatibilities such as: -
Node-only filesystem access; - native Node-only crypto/password
packages; - long-lived raw TCP assumptions.

For each incompatibility found, document the edge-native alternative.

## Questions Claude must be able to answer

-   When should this run in a Worker instead of a Node.js server?
-   Why do some Node libraries fail in Workers?
-   What is `waitUntil` for?
-   Which configuration belongs in bindings/vars vs secrets?
-   Where would cold-start assumptions matter?

## Acceptance criteria

-   Application is deployable on Cloudflare.
-   Wrangler config is committed without secrets.
-   A secret can be configured safely.
-   Production logs can be inspected.
-   Workers AI binding is proven with a minimal call.
-   Runtime compatibility decisions are documented.
