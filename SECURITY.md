# Security policy

## Reporting
Please report suspected vulnerabilities privately to the maintainers. Do not include API keys or student data in reports.

## Scope and deployment limits
This source tree applies bounded in-process request limiting, NEIS request concurrency, a short in-process cache, request input limits, and upstream abort timeouts. These controls reduce abuse in one running Node.js process only. They do not coordinate across server instances, survive restarts, or replace a CDN/WAF, reverse-proxy limits, monitoring, or provider quota controls.

`X-Forwarded-For` is ignored by default because clients can spoof it. It is used for rate-limit bucketing only when an operator sets `TRUST_PROXY_RATE_LIMIT=true` behind a proxy that removes client-supplied forwarding headers and supplies a validated client address.

Publishing source code does not itself expose the service on the internet. Internet deployment requires separate operational controls: protected secrets, HTTPS, ingress and edge rate limits, logging/alerting, patch management, and review of NEIS terms and quotas. This repository cannot verify those deployment controls.