# PR B test report

Generated: 2026-10-25T17:07:13.177Z

## test:duel-onboarding

```
> test:duel-onboarding
> node scripts/test-duel-onboarding-e2e.js

{
  "pass": true,
  "errors": []
}
```

## test:pr-b (Chromium, WebKit, mobile)

```
> test:pr-b
> node scripts/test-pr-b-build.js

{
  "at": "2026-10-25T17:08:20.001Z",
  "music": {
    "ok": true,
    "sizes": 7
  },
  "results": [
    {
      "browser": "chromium",
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "ok": true,
      "errors": []
    },
    {
      "browser": "webkit",
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "ok": true,
      "errors": []
    },
    {
      "browser": "chromium-mobile",
      "viewport": {
        "width": 390,
        "height": 844
      },
      "ok": true,
      "errors": []
    }
  ],
  "pass": true
}
```
