# PROJECT_LOG.md

Chronological engineering log for **zaban2**. Append-only style; newest entries at top.

---

## 2026-05-25 — CI/CD pipeline stabilization (PASS)

### Session goal

Resolve all CI/CD deploy failures so GitHub Actions → Cloud Run is green and backend endpoints are healthy.

### Outcome

- **GitHub Actions Run #8:** GREEN
- **Cloud Run revision:** `zaban-api-00043-nh8`
- **Endpoint validation:** `/health` 200, `/version` 200, `/ai/generate` 200
- **OpenRouter:** Working

### Fixes applied (Chat 2 — workflow only, no production code)

| Issue | Root cause | Fix |
|-------|-----------|-----|
| Deploy failure: secret not found | Newline/whitespace in GitHub Secrets values | Trimmed and re-saved secret values |
| Deploy failure: image tag | Docker image tag unquoted in workflow YAML | Proper shell quoting |
| Runtime crash: permission denied | Service account lacked Secret Manager access | Granted `secretmanager.secretAccessor` role |
| Runtime crash: SA reference | Service account email unquoted in YAML | Fixed quoting |

### Files touched

- `.github/workflows/deploy.yml` (quoting fixes)
- GitHub Secrets (UI-only — whitespace trim)
- GCP IAM (permission grant)

### Validation evidence

Chat 2 confirmed final validation. No production source code modified.

### Remaining blocker

- **Mobile TTS:** App cannot reach backend TTS from device. Chat 1 debugging path (API URL, network, CORS).

### Next exact step

Chat 1 resolves mobile TTS connectivity; then proceed to device E2E cache tests.

---

## 2026-05-23 — Governance normalization pass 5 (no runtime work)

### Session goal

Project cleanup + report normalization before next development cycle; reduce ambiguity; sync governance docs.

### Outcome

- **Canonical rollup:** `2026-05-23-GOVERNANCE-NORMALIZATION.md` pass 5 — blocker **gate chain** (Metro/UI → paste → chip → regression).
- **Summary:** `chatgpt/summary/2026-05-23-summary.md` pass 5 (single canonical daily summary).
- **Sessions 02–05:** Normalized supplements; **not merged** (no report spam).
- **Conflicts:** C1–C7 unchanged; no new fake PASS claims introduced.
- **Repo:** `CURRENT_STATUS.md` pointer fixed to canonical summary filename.
- **STABLE:** Replay/cache on device **NOT STABLE YET**.

### Next exact step

Gate 1: Metro on 8081 + UI loads → Gate 2–3: manual paste → chip 1/2 → `device-validation.ps1` + FRESH logcat.

---

## 2026-05-23 — Governance normalization pass 2–4 (no runtime work)

### Outcome (summary)

- Passes 2–4: truth table, conflicts C1–C7, session report structure, `CURRENT_STATUS.md` STALE banner.
- See `2026-05-23-GOVERNANCE-NORMALIZATION.md` for full detail.

---

## 2026-05-21 — Mobile sentence cache policy (Steps A–E) + unit test program

### Session goal

Implement mobile-only sentence TTS cache policy in phases A–E with strict scope limits, two-level testing (direct + regression), and document device/E2E as a separate gate.

### Outcome

- **Code:** Steps A–E implemented in `packages/tts-mobile` + `apps/mobile/app/index.tsx`.
- **Unit tests:** **31/31 PASS** on `tests/sentenceAudioReplay.test.ts`.
- **Device E2E:** **NOT RUN** — checklist provided to user only.
- **Documentation:** `CURRENT_STATUS.md`, `PROJECT_LOG.md`, `PROMPT_RULES.md` created/updated at repo root.

---

### Step A — Idle TTL (completed)

**Work:**
- Added `LAST_ACTIVITY_KEY`, `CACHE_IDLE_TTL_MS` (600000 ms), `touchLastActivityAt`, `getLastActivityAt`, `clearSentenceCacheIfIdleExpired` in `sentenceAudioCache.ts`.

**Tests added:** 5 in `tests/sentenceAudioReplay.test.ts` — touch, no clear when fresh, clear when expired, no clear when never touched, clear removes activity key.

**Result:** PASS (direct + regression).

---

### Step B — Activity wiring (completed)

**Work:**
- Created `cacheActivityPolicy.ts` with `shouldTouchLastActivityOn`, `shouldRunIdleCacheCheckOnAppState`.
- Wired `index.tsx`: touch on playback start/stop; idle check on `AppState` `active`; reset player/guard/loading if cache cleared.

**Tests added:** 4 policy tests — PASS.

**NOT TESTED:** React `AppState` listener on mounted `index.tsx`.

---

### Step C — In-flight dedup (completed)

**Work:**
- Created `inFlightTtsFetch.ts` (`InFlightTtsFetch` class).
- Replaced inline `Map` in `index.tsx`.
- Log string: `[TTS:Mobile] duplicate fetch blocked sentenceId=`

**Tests added:** 4 dedup tests — PASS.

**NOT TESTED:** Duplicate POST blocked on physical device with logcat.

---

### Step D — Cache-first replay/nav (completed)

**Work:**
- Created `cacheFirstPolicy.ts` — `allowNetworkForSource(source, cachedPath)`.
- `index.tsx` passes `allowNetwork` into `resolveSentenceAudio`; logs `cache HIT`, `local playback only`.

**Tests added:** 6 (replay HIT/MISS, nav HIT/MISS, hear MISS, replay/nav MISS no fetch when disallowed) — PASS.

**Bug fixed during session:** Test loop incorrectly asserted `nav` MISS with `allowNetwork true` for replay-only case — split into separate replay MISS test.

---

### Step E — Reading-unit-aware eviction (completed after correction)

**Wrong attempt (reverted):**
- Ring stored metadata only; `evictedCount` always 0; test asserted no file deletion.
- **Rejected** — product requires bounded eviction by `splitMode`.

**Correct work:**
- `getRetentionWindowSize(splitMode)`: full→2, half/quarter/eighth→3.
- `setActiveSentenceRing(keepSentenceIds: string[], playingPath?)` — evicts outside set; playing path guard.
- `buildKeepSentenceIds.ts` — pure window from sentence index + list.
- `index.tsx` calls `buildKeepSentenceIdsFromWindow` with `sentenceToId` = `generateChunkHash`.

**Tests added:** 5 ring eviction + 5 `buildKeepSentenceIds` — PASS.

**Clarification:** `splitMode` in mobile progress defaults to `'full'`; no UI to change it yet; retention API ready for future UI.

---

### Test infrastructure changes

**Problem:** Vitest failed parsing `sentenceAudioCache.ts` due to `expo-file-system` / `@react-native-async-storage/async-storage` imports.

**Fix:**
- `tests/mocks/async-storage.ts`
- `tests/mocks/expo-file-system.ts` (tracks `deletedPaths`, `getInfoAsync` for `tts_sentences/`)
- `packages/tts-core/vitest.config.ts` resolve aliases:
  - `@react-native-async-storage/async-storage` → mock
  - `expo-file-system` → mock

---

### Commands used (exact)

```powershell
cd D:\app\zaban\zaban2
npx vitest run tests/sentenceAudioReplay.test.ts --config packages/tts-core/vitest.config.ts
```

**Last run (2026-05-21):**

```
✓ tests/sentenceAudioReplay.test.ts  (31 tests) 94ms
Test Files  1 passed (1)
Tests  31 passed (31)
Duration  2.84s
```

**Git inspection:**

```powershell
git log -5 --oneline
# a6fe1ac Add TTS route diagnostic log
# b26d8e3 Temporary bypass API key auth
# ...
git rev-parse --short HEAD
# a6fe1ac
```

**Full vitest (informational only — NOT gate):**

```powershell
npx vitest run --config packages/tts-core/vitest.config.ts
```

Multiple unrelated failures (auth, crypto mock, chunk size) — **not fixed in this session**.

---

### Errors resolved

| Error | Resolution |
|-------|------------|
| Vitest cannot resolve expo/async-storage | Mocks + vitest `resolve.alias` |
| Step E test expected zero eviction | Replaced with bounded eviction tests |
| Step D test false positive on nav MISS | Split replay-only MISS assertion |

---

### Files touched (cumulative list)

```
packages/tts-mobile/src/sentenceAudioCache.ts
packages/tts-mobile/src/buildKeepSentenceIds.ts          (new)
packages/tts-mobile/src/cacheActivityPolicy.ts           (new)
packages/tts-mobile/src/cacheFirstPolicy.ts              (new)
packages/tts-mobile/src/inFlightTtsFetch.ts              (new)
apps/mobile/app/index.tsx
tests/sentenceAudioReplay.test.ts
tests/mocks/async-storage.ts                             (new)
tests/mocks/expo-file-system.ts                          (new)
packages/tts-core/vitest.config.ts
CURRENT_STATUS.md                                        (new)
PROJECT_LOG.md                                           (new)
PROMPT_RULES.md                                          (new)
```

---

### PASS / FAIL record

| Gate | State |
|------|-------|
| Step A unit | PASS |
| Step B unit (policy) | PASS |
| Step C unit | PASS |
| Step D unit | PASS |
| Step E unit | PASS |
| Regression 31-test file | PASS |
| Device E2E | **FAIL** (not executed) |
| Program A–E complete | **FAIL** (device open) |

---

### Remaining work

1. Execute Android manual E2E (Tests 1–5 + idle/resume per checklist).
2. Record results in this log with device model, build, log excerpts.
3. Commit cache changes if approved (exclude `.env`, `backend/cache/*.mp3`, keystores).

---

### Manual E2E checklist (summary — not executed)

**Setup:** Backend on LAN IP; `EXPO_PUBLIC_API_URL`; `adb logcat` filters.

| Test | Action | Pass criterion |
|------|--------|----------------|
| 1 | First Hear AI | One POST; cache MISS then HIT on replay |
| 2 | Replay | Zero POST; `local playback only` |
| 3 | Long-press ×10 | Zero POST |
| 4 | Back/Next in window | Zero POST when cached |
| 5 | Beyond retention | POST only for uncached sentence |

Extended (recommended): 10 min idle clear; post-idle first Hear POST; foreground idle check; startup regression.

---

### Architecture notes logged

- Playback remains full-sentence; `splitMode` is retention-only until sub-units exist.
- Idle TTL and active ring eviction are **orthogonal** mechanisms.
- Cache-first is enforced at `allowNetwork` + `resolveSentenceAudio`, not by changing backend.

---

### Rollback note

Stash or revert paths listed in `CURRENT_STATUS.md` § Rollback points. Do not restore unlimited-retention Step E variant.

---

## Prior history

_No earlier entries in this file at creation time. Older project phases may exist in sibling docs (`PHASE1_REPORT.md`, `CRITICAL_FACTS_AND_STATUS.md`, parent `d:\app\zaban\` tree) but are not duplicated here._
