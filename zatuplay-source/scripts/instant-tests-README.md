# Instant browser port tests

Test-only dependencies: linkedom 0.18.15 and fake-indexeddb 6.2.8. Install in a disposable development directory and expose it through NODE_PATH; these are not browser runtime dependencies.

Run `node scripts/instant-test-model.cjs` and `node scripts/instant-test-interruptions.cjs`, then each `scripts/instant-independent/*tests.cjs` and `extended-fixture-test.cjs`. See independent final-review.md for exact coverage. These model/DOM/IndexedDB tests do not replace actual browser or physical-device QA.
