# auth Capability (delta for change `harden-concurrency-stack`)

## MODIFIED Requirements

### Requirement: Login rate limit

The system SHALL throttle `POST /api/auth/login` to at most 5 attempts per minute per source IP using `@nestjs/throttler` backed by Redis storage so the limit applies across all API instances.

#### Scenario: Cross-instance limit
- **GIVEN** two API instances behind a load balancer
- **WHEN** 6 login attempts hit either or both instances within 60s
- **THEN** the 6th is HTTP 429
