# Integration Test Guideline

## Purpose

Integration Tests are used to verify the behavior of APIs, databases, transactions, authentication, authorization, business rules, and external integrations working together as a complete system.

Test objectives:

- Verify external system behavior
- Verify database state changes
- Verify business logic correctness
- Verify transaction behavior
- Verify concurrency scenarios
- Verify rollback behavior on failures
- Prevent regressions caused by future changes

---

# Test Structure

Tests should be organized by domain.

```text
tests/
├─ integration/
│
├─ auth/
│  ├─ login.test.ts
│  ├─ signup.test.ts
│  ├─ refresh.test.ts
│  └─ logout.test.ts
│
├─ relationship/
│  ├─ accept.test.ts
│  ├─ reject.test.ts
│  ├─ invite.test.ts
│  └─ get-relationship.test.ts
│
└─ concurrency/
```

Rules:

- One endpoint per test file
- Separate test files by domain
- Do not mix multiple endpoints in the same file

---

# Supporting Folder Structure

```text
tests/
├─ utils/

    ├─ auth/
    │
    │  ├─ requests/
    │  ├─ factories/
    │  ├─ queries/
    │  ├─ invalid-inputs/
    │
    ├─ user/
    │
    │  ├─ requests/
    │  ├─ factories/
    │  ├─ queries/
    │  ├─ invalid-inputs/
    │
    │
    └─ common/
```

---

# Factory Functions

Factory functions are used to generate test input data.

Location:

```text
utils/auth/factories/
utils/relationship/factories/
```

Principles:

- Generate request input only
- Do not interact with the database
- Do not contain assertions
- Do not send HTTP requests

Examples:

```ts
createExpiredRefreshCookie();
createSignupInput();
```

---

# Query Functions

Query functions are used for direct database access during testing.

Location:

```text
utils/auth/queries/
utils/relationship/queries/
```

Use cases:

- Create test data during Arrange
- Verify database state during Assert
- Clean up test data

Restrictions:

- Must not call API endpoints
- Must not contain assertions

---

# Request Functions

Request functions wrap API calls.

Location:

```text
utils/auth/requests/
```

Examples:

```ts
loginRequest();
refreshRequest();
logoutRequest();
```

Principles:

- One request function per endpoint
- Reduce duplicated HTTP request logic

---

# Invalid Inputs

Location:

```text
utils/auth/invalid-inputs/
```

Purpose:

Centralize invalid request payloads used across tests.

Examples:

```ts
invalidLoginInputs;
invalidSignupInputs;
invalidRefreshCookieCases;
```

Avoid recreating identical invalid inputs across test files.

---

# Constants

Location:

```text
utils/auth/constants/
```

Contents:

- API paths
- Fixed test parameters
- Enums
- System constants

Examples:

```ts
SIGNUP_URL;
TEST_PASSWORD_HASH_COST;
DEFAULT_USER_PASSWORD;
```

---

# Test Naming Convention

Use the following format:

```text
when <condition> should <expected_result>
```

Examples:

```text
when create item success should return created item

when duplicate item code should return conflict

when invalid name should return bad request
```

Avoid:

```text
test1

item test

happy path
```

---

# Test Pattern

All tests must follow the AAA pattern,if test don't have arrange or combine act and assert,just skip or combine as one step.

```text
Arrange
Act
Assert
```

Example:

```ts
it('when create item success should return created item', async () => {
  // Arrange
  // Act
  // Assert
});
```

Do not mix Arrange, Act, and Assert sections together.

---

# Required Assertions

Every test must verify at least:

## HTTP Status

```ts
expect(response.status).toBe(...);
```

---

## Response Body

```ts
expect(response.body);
```

---

## Response Structure

If the response contains data, verify its structure.

Example:

```ts
expect(response.body.data).toEqual(
  expect.objectContaining({
    id: expect.any(String),
    code: expect.any(String),
    name: expect.any(String),
  }),
);
```

---

# Database Assertions

Any endpoint that modifies data must verify database state.

Do not rely solely on HTTP response assertions.

Verify:

- Data creation
- Data updates
- Data deletion
- No changes when operations fail

Example:

```ts
const item = await findItemByCode(code);

expect(item).not.toBeNull();
expect(item?.name).toBe(name);
```

---

# Test Blocks

Each endpoint should have a top-level describe block.

Example:

```ts
describe('Create Conversation', () => {});
```

---

## Success

Required for every endpoint.

```ts
describe('Success', () => {});
```

Verify normal expected behavior.

---

## Server Error

Required for every endpoint.

```ts
describe('Server Error', () => {});
```

Verify:

- Database failures
- Unexpected exceptions
- Rollback behavior

---

## Validation

Create when input validation exists.

```ts
describe('Validation', () => {});
```

Verify:

- Required fields
- Format validation
- Length validation
- Enum validation
- Range validation

---

## Authentication

Create when authentication is required.

```ts
describe('Authentication', () => {});
```

Verify:

- Missing token
- Invalid token
- Expired token

---

## Authorization

Create when permissions are required.

```ts
describe('Authorization', () => {});
```

Verify:

- Role restrictions
- Permission restrictions
- Resource ownership restrictions

---

## Business Logic

Create when domain rules exist.

```ts
describe('Business Logic', () => {});
```

Examples:

- Item code must be unique
- Inactive item cannot create BOM
- Circular BOM reference is forbidden

---

# Concurrency Testing

Endpoints that modify data must consider concurrency scenarios.

Verify:

- Duplicate creation attempts
- Optimistic locking
- Pessimistic locking
- Race conditions

Principles:

Only test concurrent requests targeting the same endpoint.

Example:

```text
activate-bom

Request A
Request B

Executed simultaneously
```

Verify:

- Only one request succeeds
- No dirty data is produced
- Transactions are handled correctly
- Failed requests return expected errors

---

# Transaction Verification

Any endpoint using transactions must verify both success and failure paths.

Success:

```text
All changes are committed.
```

Failure:

```text
All changes are rolled back.
```

Never allow partial updates to remain in the database.

---

# Test Isolation

Each test must be fully independent.

Do not:

- Depend on another test's data
- Depend on execution order

Each test should:

```text
Create its own data
Verify its own results
Clean up its own data
```

---

# No Shared Mutable State

Do not share mutable variables across tests.

Avoid:

```ts
let itemId;
```

Shared state increases coupling and causes flaky tests.

---

## Transaction

Verify:

- Item and BOM consistency
- Audit/history record creation
- Rollback integrity

---

# Coverage Requirements

Each endpoint should cover:

- Success
- Validation
- Authentication
- Authorization
- Business Logic
- Concurrency
- Server Error

Sections that do not apply may be omitted.

---

# Endpoint Test Case Requirements

Every endpoint should be evaluated against the following categories:

## Success

Verifies expected successful behavior.

## Validation

Verifies request DTO, schema, and payload validation.

## Authentication

Verifies authentication failures.

## Authorization

Verifies permission and access-control failures.

## Business Logic

Verifies domain-specific rules and constraints.

## Concurrency

Verifies race conditions, locking behavior, and concurrent requests.

## Server Error

Verifies exception handling, database failures, transaction rollback, and system stability.

---

# Review Checklist

Every Integration Test PR must verify:

- Uses AAA pattern
- Verifies HTTP status
- Verifies response body
- Verifies response structure
- Verifies database state
- Verifies business rules
- Verifies transaction behavior
- Verifies rollback behavior
- Verifies concurrency scenarios
- Maintains test isolation
- Uses factory functions appropriately
- Uses request functions appropriately
- Avoids duplicate test setup logic
- Avoids magic values
- Avoids test dependencies
- Keeps tests deterministic and repeatable
