# CURRENT_STATUS.md

**Project:** Zaban / zaban2  

> **⚠️ STALE (body below):** Last full update **2026-05-21**. Mobile device validation, UI redesign, chip/input fix, and Linking work occurred **2026-05-22–23** — **not reflected** in sections below.  
> **CI/CD:** ✅ **GREEN** as of 2026-05-25 — Run #8, revision `zaban-api-00043-nh8`. All endpoints healthy.  
> **Use instead:** `D:\app\zaban\111111\gozaresh ai\cursor\TODAY_SUMMARY.md` + `MASTER_DEBUG_HISTORY.md` + `LATEST_SESSION.md`  
> **Device replay/cache:** **NOT STABLE YET** — chip-gated regression not passed.  
> **Active blocker:** Mobile TTS path — Chat 1 debugging.

**Last updated (body):** 2026-05-21 (session: mobile sentence-cache policy Steps A–E + unit test program)  
**Git HEAD (workspace):** `a6fe1ac` — *Note: cache-policy file changes may be uncommitted; verify with `git status` before deploy.*

---

## Executive summary

Mobile sentence-level TTS cache policy (Steps **A–E**) is **implemented in source** and **verified by unit/helper tests (31/31 PASS)**. **Device/Android E2E is NOT TESTED** — only a manual checklist was prepared. **Do not mark production-ready on device** until E2E checklist Tests 1–5 (and extended idle/resume tests) pass with log evidence.

**Overall program status:** Unit/helper cache program **PASS**. Full A–E including device **FAIL** (device gate open).

---

## Stable systems (do not break)

| System | Location | Status |
|--------|----------|--------|
| Web TTS / ReadingScreen | `components/ReadingScreen.tsx`, `types.ts` (`ReadUnit`) | **Stable — not modified this session** |
| Backend TTS API | `backend/server.js`, `/tts` | **Stable — forbidden scope** |
| Cloud Run / deploy pipelines | `.github/workflows/`, `cloudbuild.yaml` | **✅ Stable — Run #8 green, rev `zaban-api-00043-nh8`** |
| Streaming / chunked web orchestrators | `services/streamingTtsOrchestrator.ts`, etc. | **Stable — not modified** |
| Mobile playback stack | `MobileAudioPlayer`, `OperationGuard` | **Stable — behavior unchanged** |
| Sentence splitting (playback) | `splitIntoSentences()` — full sentences only | **Stable — no sub-unit playback** |

---

## Completed work (exact)

### Step A — Idle TTL metadata (PASS)

**Goal:** 10-minute idle clears all sentence cache; metadata only in AsyncStorage.

**Files:** `packages/tts-mobile/src/sentenceAudioCache.ts`

**Added:**
- `LAST_ACTIVITY_KEY = '@zaban/sentence_cache_last_activity'`
- `CACHE_IDLE_TTL_MS = 10 * 60 * 1000` (10 minutes)
- `touchLastActivityAt(now?)`
- `getLastActivityAt()`
- `clearSentenceCacheIfIdleExpired(now?)` → calls `clearSentenceCache()` + removes activity key

**Tests:** 5 direct TTL tests in `tests/sentenceAudioReplay.test.ts` — **PASS**

---

### Step B — Activity wiring in app (unit PASS; device NOT TESTED)

**Goal:** Touch activity on play/stop; run idle expiry check on foreground `active`.

**Files:**
- `packages/tts-mobile/src/cacheActivityPolicy.ts` (pure policy)
- `apps/mobile/app/index.tsx` (thin wiring)

**Wiring:**
- `shouldTouchLastActivityOn('playback_start'|'playback_stop')` → `touchLastActivityAt()`
- `shouldRunIdleCacheCheckOnAppState('active')` → `clearSentenceCacheIfIdleExpired()`; on clear → reset in-flight playback state

**Tests:** 4 policy tests — **PASS**. React `AppState` mount — **NOT TESTED**.

---

### Step C — In-flight dedup (unit PASS; device NOT TESTED)

**Goal:** Same `sentenceId` cannot trigger duplicate POST `/tts` while fetch in flight.

**Files:**
- `packages/tts-mobile/src/inFlightTtsFetch.ts`
- `apps/mobile/app/index.tsx` — `InFlightTtsFetch<Uint8Array>` replaces inline `Map`

**Log:** `[TTS:Mobile] duplicate fetch blocked sentenceId=`

**Tests:** 4 direct dedup tests — **PASS**. Log on device — **NOT TESTED**.

---

### Step D — Cache-first replay/nav (unit PASS; device NOT TESTED)

**Goal:** Back, Next, Replay, Long-press do not POST when cached audio exists.

**Files:**
- `packages/tts-mobile/src/cacheFirstPolicy.ts` — `allowNetworkForSource(source, cachedPath)`
- `apps/mobile/app/index.tsx` — uses helper; logs `cache HIT`, `local playback only`

**Policy:**
- `hear`: network allowed (HIT still skips fetch via `resolveSentenceAudio`)
- `replay`: never network
- `nav`: network only on cache MISS

**Tests:** 6 policy + `resolveSentenceAudio` integration tests — **PASS**

---

### Step E — Reading-unit-aware eviction (scoped PASS)

**Goal:** Bounded active cache by `splitMode`; **not** unlimited retention until TTL.

**Files:**
- `packages/tts-mobile/src/sentenceAudioCache.ts` — `getRetentionWindowSize`, `setActiveSentenceRing(keepSentenceIds, playingPath?)`
- `packages/tts-mobile/src/buildKeepSentenceIds.ts` — pure window builder
- `apps/mobile/app/index.tsx` — `buildKeepSentenceIdsFromWindow(index, sentences, splitMode, sentenceToId)`

**Retention (sentence-index proxy; playback still full sentences):**

| `splitMode` | Window size (sentence IDs kept) |
|-------------|----------------------------------|
| `full` | 2 (current + 1 previous) |
| `half`, `quarter`, `eighth` | 3 (current + 2 previous) |

**Eviction:** Deletes files + index entries outside keep set; skips `playingPath` if in use.

**Rejected implementation:** Metadata-only ring (`evictedCount: 0` always) — **reverted** per product policy.

**Tests:** 5 Step E + 5 `buildKeepSentenceIds` tests — **PASS**

---

## Tests performed (exact)

### Command (sole regression gate for cache program)

```powershell
cd D:\app\zaban\zaban2
npx vitest run tests/sentenceAudioReplay.test.ts --config packages/tts-core/vitest.config.ts
```

### Last verified result (2026-05-21)

```
Test Files  1 passed (1)
Tests  31 passed (31)
Duration  ~2.8s
```

### Test breakdown (31 tests)

| Suite | Count | Step | Result |
|-------|-------|------|--------|
| sentence audio replay (Phase 2) | 2 | baseline replay | PASS |
| sentence cache idle TTL (Step A) | 5 | TTL | PASS |
| sentence cache ring (Step E) | 5 | eviction | PASS |
| cache activity policy (Step B) | 4 | policy | PASS |
| in-flight TTS dedup (Step C) | 4 | dedup | PASS |
| cache-first policy (Step D) | 6 | cache-first | PASS |
| buildKeepSentenceIds (index cache window) | 5 | window IDs | PASS |

### Full-repo vitest (NOT used as gate)

`npx vitest run --config packages/tts-core/vitest.config.ts` — **multiple unrelated failures** (auth DB, hashing crypto mock, chunk size). **Do not use as cache-program gate.**

---

## PASS / FAIL matrix

| Item | Direct tests | Regression (31-file suite) | Device E2E | Overall |
|------|--------------|----------------------------|--------------|---------|
| Step A TTL | PASS | PASS | NOT TESTED | **PASS** (unit) |
| Step B wiring | PASS (policy) | PASS | NOT TESTED | **PASS** (unit only) |
| Step C dedup | PASS | PASS | NOT TESTED | **PASS** (unit only) |
| Step D cache-first | PASS | PASS | NOT TESTED | **PASS** (unit only) |
| Step E eviction | PASS | PASS | NOT TESTED | **PASS** (scoped unit) |
| buildKeepSentenceIds | PASS | PASS | NOT TESTED | **PASS** (unit) |
| **Program A–E + device** | — | — | **NOT TESTED** | **FAIL** (open) |

---

## Files changed (this session — exact paths)

### Production / library

- `packages/tts-mobile/src/sentenceAudioCache.ts`
- `packages/tts-mobile/src/buildKeepSentenceIds.ts` (new)
- `packages/tts-mobile/src/cacheActivityPolicy.ts` (new)
- `packages/tts-mobile/src/cacheFirstPolicy.ts` (new)
- `packages/tts-mobile/src/inFlightTtsFetch.ts` (new)
- `apps/mobile/app/index.tsx`

### Tests / test infra

- `tests/sentenceAudioReplay.test.ts`
- `tests/mocks/async-storage.ts` (new)
- `tests/mocks/expo-file-system.ts` (new)
- `packages/tts-core/vitest.config.ts` (resolve aliases for expo mocks)

### Not changed (forbidden / stable)

- `components/ReadingScreen.tsx`
- `backend/**`
- `packages/tts-mobile/src/MobileAudioPlayer.ts` (behavior)
- `packages/tts-mobile/src/operationGuard.ts`
- `packages/tts-mobile/src/splitSentences.ts` (logic)
- Sub-unit playback, shared chunk architecture, web `ReadUnit` alignment

---

## Architecture decisions (exact)

1. **Cache keys:** `sentenceId` = `generateChunkHash(sentence text, voice, preset, speed, pitch, format, sampleRate)` — unchanged.
2. **Playback unit:** Still **one full sentence** per play; `splitMode` affects **retention window only**, not TTS text.
3. **Active eviction:** `setActiveSentenceRing(keepSentenceIds[])` — not legacy two-ID-only API.
4. **Idle cleanup:** Only `clearSentenceCacheIfIdleExpired()` after 10 min idle — not during active reading navigation.
5. **Network policy:** Centralized in `allowNetworkForSource`; resolution in `resolveSentenceAudio`.
6. **Dedup:** `InFlightTtsFetch` class — single factory per `sentenceId` until promise settles.
7. **Test strategy:** Pure helpers + vitest mocks; no React Native test renderer for `index.tsx`.

---

## Forbidden scopes (current)

- Backend, Cloud Run, provider changes
- Web `ReadingScreen.tsx` / `createChunks` / `ReadUnit` alignment in this track
- Real half/quarter/eighth **playback** (sub-unit TTS text)
- Shared chunk systems across web/mobile
- Unlimited cache until TTL only (rejected Step E variant)
- UI layout/copy changes for cache policy
- Shortening `CACHE_IDLE_TTL_MS` in production without explicit product approval

---

## CI/CD stabilization (2026-05-25)

| Check | Result |
|-------|--------|
| GitHub Actions Run #8 | **GREEN** |
| Cloud Run revision | `zaban-api-00043-nh8` |
| `/health` | 200 |
| `/version` | 200 |
| `/ai/generate` | 200 |
| OpenRouter integration | Working |

### Fixes applied (workflow only)

| Issue | Fix |
|-------|-----|
| Newline/whitespace in GitHub Secrets | Trimmed values |
| Docker image tag quoting | Proper shell quoting |
| Secret Manager permission | Granted to service account |
| Service account reference quoting | Fixed YAML quoting |

**Workflow status:** Stable — no further changes required.

---

## Remaining blockers

1. ~~**CI/CD deploy pipeline**~~ — **RESOLVED** (Run #8 green, 2026-05-25).
2. **Mobile TTS path** — not connecting to backend from device; Chat 1 actively debugging.
3. **Device/Android E2E not executed** — manual checklist Tests 1–5 (+ idle/resume/startup) required.
4. **`index.tsx` not covered by automated integration tests** — policy tests only.
5. **Real `generateChunkHash` not exercised in unit tests** — stub `sentenceToId` in `buildKeepSentenceIds` tests.
6. **Git commit** — cache work may be uncommitted; confirm before release.

---

## NOT TESTED areas (exact)

- Android device Hear AI / replay / Back / Next with logcat POST counts
- 10-minute real-world idle TTL (wall clock)
- App resume after idle clear (`cache_idle_cleared_on_resume` endurance log)
- `splitMode` half/quarter/eighth on device (default UI is `full`; progress JSON only)
- Expo production build / Play Store binary
- Full monorepo vitest suite
- Ring eviction under low storage / permission errors on device

---

## Rollback points

| Rollback to | What you lose | How |
|-------------|---------------|-----|
| Pre–Step A | No TTL helpers | Revert `sentenceAudioCache.ts` TTL exports + Step A tests |
| Pre–Step B/C/D helpers | Inline index logic | Remove 3 helper files; restore inline `allowNetwork`, `Map` dedup, direct `touchLastActivityAt` calls |
| Pre–Step E (legacy ring) | Two-sentence eviction only | Restore `setActiveSentenceRing(current, previous)` signature + caller in `index.tsx` |
| Pre–Step E (bad unlimited) | **Do not use** | Was rejected — `evictedCount: 0` always |
| Git `a6fe1ac` | Entire session cache work | `git checkout a6fe1ac -- <paths>` or stash |

**Safe production baseline for mobile cache tests:**

```powershell
git stash push -m "mobile-cache-A-E" -- packages/tts-mobile apps/mobile/app/index.tsx tests packages/tts-core/vitest.config.ts
```

---

## Next step (exact)

1. **Run manual Android E2E checklist** (Tests 1–5 minimum; document in `PROJECT_LOG.md`).
2. **Do not** start sub-unit playback or web/mobile chunk unification until E2E PASS.
3. Optional: commit cache program with message referencing Steps A–E + `31/31` vitest.
4. Optional: export new helpers from `packages/tts-mobile/src/index.ts` for consistency (not required while tsconfig paths work).

---

## Manual E2E artifact

Checklist delivered in chat (session); not stored as separate file unless copied to `docs/MOBILE_CACHE_E2E_CHECKLIST.md` by team.

**Log filters:** `TTS:Mobile`, `SentenceCache`, `Endurance`, `network POST`.
