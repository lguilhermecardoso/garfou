# E2E Testing Setup

## Configuration

- **Tool**: Playwright
- **Config**: `playwright.config.ts`
- **Test Directory**: `e2e/`
- **Command**: `npm run test:e2e`

## Supported Browsers

- Chromium
- Firefox
- WebKit (Safari)

## Test Suites

### 1. Authentication & Onboarding Flow
**File**: `e2e/auth-onboarding.spec.ts`

Tests cover:
- Homepage display
- Sign-in page navigation
- Form validation
- Invalid credentials handling
- Sign-up navigation
- Onboarding flow (2-step process)
- Restaurant creation

### 2. Rate Limiting
Placeholder for rate limit verification tests.

### 3. Public Menu & NPS
Tests for digital menu and NPS form accessibility.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test e2e/auth-onboarding.spec.ts

# Debug mode
npx playwright test --debug
```

## Features

- Automatic dev server startup on test run
- Screenshot capture on failures
- Trace recording for debugging
- HTML report generation
- Parallel test execution (dev) / Serial (CI)
- Retry support (CI only)

## Best Practices

1. **Wait for elements**: Use proper selectors and visibility checks
2. **Error handling**: Expect error messages with flexible regex patterns
3. **State isolation**: Each test should be independent
4. **Accessibility**: Use visible text or ARIA labels when possible
5. **Performance**: Use `waitUntil: 'networkidle'` for critical paths

## Future Test Cases

- [ ] Complete authentication flow (sign up → sign in → create restaurant)
- [ ] Order creation flow (menu → cart → checkout)
- [ ] Kitchen workflow (order confirmation → status updates)
- [ ] Dashboard navigation and data display
- [ ] Mobile responsiveness
- [ ] Payment integration
