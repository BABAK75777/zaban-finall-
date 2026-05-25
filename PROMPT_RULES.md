# PROMPT_RULES.md

**Purpose:** Persistent rules for AI and human contributors on **zaban2**. Rules may be **appended** or clarified; **do not weaken or delete** sections marked **(CORE)** without explicit product owner approval.

**Last updated:** 2026-05-21

---

## (CORE) Scope and forbidden work

1. **Mobile cache track** changes only:
   - `packages/tts-mobile/**`
   - `apps/mobile/app/index.tsx` (wiring only)
   - `tests/**` and `packages/tts-core/vitest.config.ts` (test infra)
2. **Forbidden without explicit approval:**
   - `backend/**`, Cloud Run, deploy YAML, API contracts
   - `components/ReadingScreen.tsx`, web chunk/streaming architecture
   - UI layout, copy, navigation structure
   - Sub-unit playback (half/quarter/eighth **TTS text**)
   - Shared chunk / `createChunks` alignment across web and mobile
   - Deploy workflow (`.github/workflows/deploy.yml`) — **validated green Run #8; do not modify** without CI/CD regression evidence
   - Networking behavior changes except **blocking duplicate in-flight POST** for same `sentenceId`
   - Unlimited sentence cache until TTL only (rejected policy)
3. **Stable systems — do not regress:**
   - Web reading + TTS orchestration
   - Backend `/tts` endpoint semantics
   - `MobileAudioPlayer`, `OperationGuard` playback semantics
   - Full-sentence playback path in mobile

---

## (CORE) Phase gate workflow

Every cache-policy step (A, B, C, …) must complete **all** before the next step starts:

| Gate | Requirement |
|------|-------------|
| 1. Direct tests | New tests for the step’s behavior — **PASS** |
| 2. Regression | `npx vitest run tests/sentenceAudioReplay.test.ts --config packages/tts-core/vitest.config.ts` — **PASS** |
| 3. Scope audit | No forbidden files in diff |
| 4. Documentation | Update `CURRENT_STATUS.md` + append `PROJECT_LOG.md` |
| 5. Device E2E | **Separate program** — unit PASS does **not** close device gate |

**Do not claim “Step X complete” on device until E2E checklist PASS with log evidence.**

---

## (CORE) Testing rules

### Regression command (canonical)

```powershell
cd D:\app\zaban\zaban2
npx vitest run tests/sentenceAudioReplay.test.ts --config packages/tts-core/vitest.config.ts
```

- **Gate:** 31/31 (or current count — update docs when tests added).
- **Do not** use full-repo vitest as the cache-program gate until unrelated failures are triaged.

### Direct vs integration

- **Prefer** pure functions in `packages/tts-mobile/src/*.ts` with unit tests.
- **`index.tsx`:** wiring only; **not** required in vitest mount unless explicitly scoped.
- **Mocks required** for `expo-file-system` and `@react-native-async-storage/async-storage` in Node vitest.

### Test honesty

- Record **PASS**, **FAIL**, or **NOT TESTED** explicitly.
- Never mark device E2E PASS from unit tests alone.
- Never assert `evictedCount === 0` for active reading if product requires bounded eviction.

---

## (CORE) Validation rules

1. **Cache key:** `sentenceId` from `generateChunkHash` on **full sentence text** (current playback unit).
2. **Idle TTL:** `CACHE_IDLE_TTL_MS = 600000` (10 min); only `clearSentenceCacheIfIdleExpired()` clears on idle.
3. **Active retention:** `getRetentionWindowSize(splitMode)` — full: 2 IDs; half/quarter/eighth: 3 IDs.
4. **Cache-first:** `replay` → no network; `nav` → network on MISS only; `hear` → may network on MISS.
5. **Dedup:** One in-flight fetch per `sentenceId` until promise settles.

---

## Stabilization rules

1. **Minimal diff** — smallest change that satisfies the step; no drive-by refactors.
2. **Extract helpers** only when needed for testability (`cacheFirstPolicy`, `buildKeepSentenceIds`, etc.).
3. **Reject** implementations that contradict written policy (e.g. unlimited cache until TTL).
4. **Revert wrong Step E** immediately; fix tests to match bounded eviction.
5. **Do not commit** `.env`, API keys, `debug.keystore`, or `backend/cache/tts/*.mp3`.

---

## Anti-rabbit-hole rules

1. **One step per session slice** unless user explicitly batches.
2. **Stop** after regression PASS + doc update; do not start sub-unit playback “while here.”
3. **Do not** fix unrelated vitest failures in the cache track.
4. **Do not** align mobile `splitMode` with web `ReadUnit` without a dedicated approved project.
5. **Do not** add UI for split modes during cache policy work.
6. If tests fail twice on the same approach, **re-read policy** in `CURRENT_STATUS.md` before a third attempt.

---

## Device / E2E validation rules

1. **Required before production claim:** Manual Android checklist (minimum Tests 1–5).
2. **Evidence:** `adb logcat` snippets showing POST count and `[SentenceCache]` / `[TTS:Mobile]` lines.
3. **Report template:** Device model, Android version, backend URL, per-test PASS/FAIL, log excerpts.
4. **Extended tests (recommended):** 10 min idle; resume after idle clear; foreground idle check; cold start regression.
5. **FAIL device gate** if any mandatory test shows unexpected POST or missing cache HIT log.

---

## Regression testing rules

1. After **any** change to `sentenceAudioCache.ts`, `cacheFirstPolicy.ts`, `inFlightTtsFetch.ts`, `buildKeepSentenceIds.ts`, or `index.tsx` cache wiring → run canonical vitest command.
2. After adding tests → update count in `CURRENT_STATUS.md`.
3. Before merge/release → confirm `git status` does not include secrets or binary cache artifacts.

---

## Documentation rules (session end)

Before ending a session that touched cache policy, AI **must** update:

- `CURRENT_STATUS.md` — exact PASS/FAIL, files, commands, blockers, NOT TESTED, rollback, next step
- `PROJECT_LOG.md` — chronological entry with commands and outcomes
- `PROMPT_RULES.md` — append new rules; **never weaken (CORE) sections**

**No placeholders** (“TBD”, “see above”, “various files”) in status docs.

---

## Workflow rules (2026-05-21 additions)

1. **Two-level testing:** direct step tests + full `sentenceAudioReplay.test.ts` regression.
2. **Wrong Step E pattern:** metadata-only ring with zero file eviction is **invalid** — use `setActiveSentenceRing(keepSentenceIds[])`.
3. **splitMode semantics:** retention window only; playback text stays full sentence until sub-unit project exists.
4. **Test infra:** maintain expo/async-storage mocks when adding cache modules that import RN APIs.
5. **Program complete definition:** A–E unit PASS **and** device E2E PASS **and** docs updated.

---

## Commit and PR rules

1. **Commit only when user asks.**
2. **Never** commit `.env`, credentials, or local TTS mp3 cache files.
3. PR body must list: steps completed, vitest command + result, device E2E state (PASS/FAIL/NOT TESTED).

---

## Quick reference — current program state

| Item | Value |
|------|-------|
| Unit tests | 31/31 PASS (`sentenceAudioReplay.test.ts`) |
| Device E2E | NOT TESTED |
| CI/CD pipeline | ✅ GREEN — Run #8, rev `zaban-api-00043-nh8` |
| Git HEAD (reference) | `a6fe1ac` |
| Next action | Fix mobile TTS path → Android manual E2E → log in `PROJECT_LOG.md` |

See `CURRENT_STATUS.md` for full detail.
