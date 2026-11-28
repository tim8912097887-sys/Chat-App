# Auth Domain Integration Test Policy

## POST /auth/signup

### Success

#### should signup successfully without image

**Verify:**

- Returns `201 Created`
- User is created
- Password is hashed before persistence

---

#### should signup successfully with image

**Verify:**

- Returns `201 Created`
- User is created
- Image is uploaded
- Image URL is persisted

---

### Validation

#### should reject invalid email

**Verify:**

- Returns `400 Bad Request`

---

#### should reject name shorter than minimum length

**Verify:**

- Returns `400 Bad Request`

---

#### should reject password shorter than 8 characters

**Verify:**

- Returns `400 Bad Request`

---

#### should reject password longer than 72 characters

**Verify:**

- Returns `400 Bad Request`

---

#### should reject unsupported image mime type

**Verify:**

- Returns `400 Bad Request`

---

#### should reject oversized image

**Verify:**

- Returns `400 Bad Request`

---

### Business Logic

#### should return success even when email already exists

**Verify:**

- Returns `201 Created`
- No additional user record is created
- Existing user remains unchanged

---

#### should cleanup uploaded image when email already exists

**Scenario:**

- Image upload succeeds
- User creation fails due to duplicate email

**Verify:**

- Uploaded image is deleted
- No orphan image remains

---

### Concurrency

#### should create only one user when concurrent requests use the same email

**Scenario:**

- Two signup requests execute simultaneously

**Verify:**

- Only one user is created
- Email uniqueness is preserved

---

### Server Error

#### should cleanup uploaded image when user creation fails unexpectedly

**Scenario:**

- Image upload succeeds
- Database operation fails

**Verify:**

- Uploaded image is deleted
- Error is propagated

---

# POST /auth/login

## Success

#### should login successfully

**Verify:**

- Returns `200 OK`
- Access token is returned
- Refresh token cookie is set
- Refresh token record is created

---

#### should clear failed login state after successful login

**Scenario:**

- User previously has failed login attempts

**Verify:**

- `loginAttempt` is reset to `0`
- `loginLockedAt` is cleared

---

### Validation

#### should reject invalid email format

**Verify:**

- Returns `400 Bad Request`

---

#### should reject password shorter than minimum length

**Verify:**

- Returns `400 Bad Request`

---

### Business Logic

#### should reject nonexistent email

**Verify:**

- Returns appropriate authentication error
- Failure reason does not reveal account existence

---

#### should reject incorrect password

**Verify:**

- Returns authentication error
- Login attempt counter is incremented

---

#### should lock account after maximum failed attempts

**Verify:**

- Account becomes locked
- `loginLockedAt` is populated
- Attempt counter is reset

---

#### should reject login when account is locked

**Verify:**

- Login is denied
- Lock state remains unchanged

---

#### should allow login after lock duration expires

**Verify:**

- Lock state is cleared
- Login succeeds

---

#### should reject inactive user

**Verify:**

- Authentication fails

---

### Concurrency

#### should increment failed login attempts correctly under concurrent requests

**Verify:**

- No lost updates occur
- Account lock behavior remains correct

---

#### should issue independent refresh tokens for concurrent successful logins

**Verify:**

- Multiple refresh token records are created
- Token hashes are unique

---

### Server Error

#### should fail login when refresh token persistence fails

**Verify:**

- Error is returned
- Partial session state is not created

---

# POST /auth/refresh

## Success

#### should rotate refresh token successfully

**Verify:**

- Returns new access token
- Returns new refresh cookie
- Old refresh token is revoked
- New refresh token record is created

---

#### should preserve token family during rotation

**Verify:**

- New refresh token references same family

---

### Validation

#### should reject missing refresh token cookie

**Verify:**

- Authentication fails

---

#### should reject malformed refresh token

**Verify:**

- Authentication fails

---

#### should reject expired refresh token

**Verify:**

- Authentication fails

---

### Business Logic

#### should reject refresh when user does not exist

**Verify:**

- Authentication fails

---

#### should reject refresh when user is inactive

**Verify:**

- Authentication fails

---

#### should reject refresh when token version does not match

**Verify:**

- Authentication fails

---

#### should reject unknown refresh token hash

**Verify:**

- Authentication fails

---

#### should reject revoked refresh token

**Verify:**

- Authentication fails

---

#### should reject replaced refresh token

**Verify:**

- Authentication fails

---

#### should revoke token family when refresh token reuse is detected

**Scenario:**

```text
A -> B
reuse A
```

**Verify:**

- Entire family is revoked

---

#### should invalidate all descendants after refresh token reuse

**Scenario:**

```text
A -> B -> C
reuse A
```

**Verify:**

- A is invalid
- B is invalid
- C is invalid

---

### Concurrency

#### should allow only one successful refresh when same token is used concurrently

**Scenario:**

```text
refresh(A)
refresh(A)
```

**Verify:**

- One request succeeds
- One request fails
- Only one child token is created

---

#### should revoke family after refresh token race condition reuse

**Verify:**

- Family revocation logic is executed correctly

---

### Server Error

#### should rollback transaction when child token creation fails

**Scenario:**

- Parent token is revoked
- Child creation fails

**Verify:**

- Transaction is rolled back
- Data remains consistent

---

# POST /auth/logout

## Success

#### should revoke refresh token

**Verify:**

- Token is revoked
- Cookie is cleared

---

### Validation

#### should reject missing refresh token cookie

**Verify:**

- Authentication fails

---

#### should reject malformed refresh token

**Verify:**

- Authentication fails

---

### Business Logic

#### should support idempotent logout behavior

**Scenario:**

- Logout is called multiple times

**Verify:**

- Behavior matches API specification
- No data corruption occurs

---

### Concurrency

#### should handle concurrent logout requests safely

**Verify:**

- Token is revoked correctly
- No inconsistent state is introduced

---

# POST /auth/logout-all

## Success

#### should logout all sessions

**Verify:**

- Token version is incremented
- All refresh tokens are revoked
- Refresh cookie is cleared

---

#### should disconnect online user after logout-all

**Verify:**

- Presence service disconnects the user

---

### Business Logic

#### should invalidate existing access tokens after logout-all

**Scenario:**

```text
login
logout-all
access protected endpoint
```

**Verify:**

- Request is rejected

---

#### should invalidate refresh tokens from all devices

**Scenario:**

```text
device1 login
device2 login
device3 login
logout-all
```

**Verify:**

- All refresh tokens become invalid

---

### Concurrency

#### should increment token version only once for concurrent logout-all requests

**Scenario:**

```text
logout-all
logout-all
```

**Verify:**

- Optimistic locking works correctly
- Token version increments only once

---

# Cross Endpoint Flow Tests

## Authentication Lifecycle

#### should complete signup -> login -> refresh -> logout flow successfully

**Verify:**

- Entire authentication lifecycle works correctly

---

#### should support chained refresh token rotation

**Scenario:**

```text
login
refresh
refresh
```

**Verify:**

- Rotation chain remains valid

---

#### should reject refresh after logout

**Scenario:**

```text
login
logout
refresh
```

**Verify:**

- Refresh fails

---

#### should reject refresh after logout-all

**Scenario:**

```text
login
logout-all
refresh
```

**Verify:**

- Refresh fails

---

#### should reject access token after logout-all

**Scenario:**

```text
login
logout-all
access protected endpoint
```

**Verify:**

- Access is denied

---

#### should keep other sessions valid after single-session logout

**Scenario:**

```text
device1 login
device2 login
device1 logout
```

**Verify:**

- Device2 session remains valid

---

#### should invalidate all sessions after logout-all

**Scenario:**

```text
device1 login
device2 login
device3 login
logout-all
```

**Verify:**

- All sessions become invalid

---

# Coverage Requirements

## Success Tests

Minimum: 10+

## Validation Tests

Minimum: 10+

## Business Logic Tests

Minimum: 20+

## Concurrency Tests

Minimum: 8+

## Server Error Tests

Minimum: 5+

## Cross Endpoint Flow Tests

Minimum: 8+

---

## Expected Total

Approximately:

```text
50 - 70 integration test cases
```

This coverage level is appropriate for an authentication domain that includes:

- Account registration
- Login lockout protection
- Refresh token rotation
- Refresh token family revocation
- Session management
- Multi-device authentication
- Logout-all invalidation
- Concurrency handling
