# Phase Checklist - Complete Testing Workflow

## هدف
چک‌لیست کامل برای اجرای تمام Phases و Final E2E Test

---

## Phase 0: Baseline Capture

**Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

**Actions:**
- [ ] Frontend و Backend روشن هستند
- [ ] Chrome DevTools → Network tab (filter: tts, preserve log: ON)
- [ ] Normal playback تست شده
- [ ] Speed change playback تست شده
- [ ] `PHASE0_BASELINE` report تولید شده

**Output Required:**
```
PHASE0_BASELINE:
- Normal: {OPTIONS_seen, OPTIONS_status, A-C-Allow-Headers, POST_seen, POST_status, Content-Type, has_audioBase64, audioBase64_length, console_error_summary}
- SpeedChanged: {same fields}
- Diff: [differences]
```

**Next:** اگر OPTIONS fail یا POST blocked → برو Phase 1. اگر همه OK → برو Phase 2.

---

## Phase 1: CORS & Request Reachability

**Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

**Actions:**
- [ ] Backend restart شده (تغییرات CORS اعمال شده)
- [ ] Normal playback تست شده
- [ ] Speed change playback تست شده
- [ ] Network tab: OPTIONS 204/200 و POST not blocked
- [ ] Backend console: `[TTS] hit` دیده می‌شود
- [ ] `PHASE1_TEST_RESULT` report تولید شده

**Output Required:**
```
PHASE1_TEST_RESULT:
- Normal: {OPTIONS_status, POST_status, any_console_error}
- SpeedChanged: {OPTIONS_status, POST_status, any_console_error}
```

**Next:** اگر همه OK → برو Phase 2. اگر مشکل CORS باقی است → بررسی بیشتر.

---

## Phase 2: TTS Response Shape & Audio Delivery

**Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

**Actions:**
- [ ] Backend restart شده (تغییرات response contract اعمال شده)
- [ ] Normal playback تست شده
- [ ] Response format بررسی شده: `{ok, audioBase64, mimeType, durationMsEstimate}`
- [ ] Error case تست شده (invalid API key یا empty text)
- [ ] UI error handling بررسی شده (exits buffering)
- [ ] `PHASE2_TEST_RESULT` report تولید شده

**Output Required:**
```
PHASE2_TEST_RESULT:
- Normal: {ok: true, mimeType, audioBase64_length, UI_state_after}
- ErrorCase: {ok: false, error, UI_state_after}
```

**Next:** اگر همه OK → برو Phase 3. اگر مشکل response contract → بررسی بیشتر.

---

## Phase 3: Speed Control Without Extra TTS

**Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

**Actions:**
- [ ] Frontend restart شده (تغییرات speed handling اعمال شده)
- [ ] Network tab: filter `tts`, preserve log: ON
- [ ] Audio playback شروع شده
- [ ] Speed slider 5-10 بار تغییر داده شده (در حین playback)
- [ ] Network tab: هیچ POST /tts جدیدی دیده نمی‌شود
- [ ] Console: playbackRate changes log شده
- [ ] `PHASE3_TEST_RESULT` report تولید شده

**Output Required:**
```
PHASE3_TEST_RESULT:
- Network_TTS_calls_during_speed_change: 0
- playbackRate_values_observed: [1.0, 0.8, 1.2, ...]
- any_errors: none
```

**Next:** اگر همه OK → برو Phase 4. اگر speed change باعث /tts می‌شود → بررسی بیشتر.

---

## Phase 4: Buffering/Next State Machine

**Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

**Actions:**
- [ ] Frontend restart شده (تغییرات state machine اعمال شده)
- [ ] Normal playback تست شده
- [ ] Buffering progress بررسی شده: "Buffering 0/1" → "Buffering 1/1"
- [ ] NEXT button بررسی شده: disabled → enabled
- [ ] Error case تست شده (backend stop)
- [ ] UI از buffering خارج می‌شود
- [ ] Console: state transitions log شده
- [ ] `PHASE4_TEST_RESULT` report تولید شده

**Output Required:**
```
PHASE4_TEST_RESULT:
- Scenario1: {buffer_progress: "0/1 → 1/1", next_enabled: "disabled → enabled"}
- Scenario2: {buffer_progress: "0/1 → error", error_visible: true, ui_not_hung: true}
```

**Next:** اگر همه OK → برو Final E2E. اگر buffering hang می‌کند → بررسی بیشتر.

---

## Final E2E Test

**Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

**Prerequisites:**
- ✅ Phase 0: PASS
- ✅ Phase 1: PASS
- ✅ Phase 2: PASS
- ✅ Phase 3: PASS
- ✅ Phase 4: PASS

**Actions:**

### Test 1: Rapid Fire
- [ ] `testRapidFire()` اجرا شده
- [ ] "Hear AI" 10 بار سریع کلیک شده
- [ ] `finishRapidFireTest()` اجرا شده
- [ ] Results بررسی شده

### Test 2: Speed Torture
- [ ] `testSpeedTorture()` اجرا شده
- [ ] Audio playback شروع شده
- [ ] Speed slider 20 بار تغییر داده شده
- [ ] `finishSpeedTortureTest()` اجرا شده
- [ ] Results بررسی شده

### Test 3: Offline
- [ ] `testOffline()` اجرا شده
- [ ] Backend stop شده
- [ ] "Hear AI" کلیک شده
- [ ] UI state بررسی شده
- [ ] Backend restart شده
- [ ] Playback دوباره تست شده
- [ ] `finishOfflineTest()` اجرا شده
- [ ] Results بررسی شده

### Test 4: Long Text
- [ ] `testLongText()` اجرا شده
- [ ] متن 2000+ کاراکتر paste شده
- [ ] "Hear AI" کلیک شده
- [ ] UI responsiveness بررسی شده
- [ ] NEXT button logic بررسی شده
- [ ] `finishLongTextTest()` اجرا شده
- [ ] Results بررسی شده

### Final Report
- [ ] `generateFinalReport()` اجرا شده
- [ ] Final report بررسی شده
- [ ] Known issues لیست شده

**Output Required:**
```
FINAL_E2E_RESULT:
- RapidFire: PASS/FAIL + evidence
- SpeedTorture: PASS/FAIL + evidence
- Offline: PASS/FAIL + evidence
- LongText: PASS/FAIL + evidence
- KnownRemainingIssues: <list or "None">
- Conclusion: "Ready to move on" / "Not ready - issues remain"
```

---

## Overall Status

- Phase 0: ⬜ / ✅ / ❌
- Phase 1: ⬜ / ✅ / ❌
- Phase 2: ⬜ / ✅ / ❌
- Phase 3: ⬜ / ✅ / ❌
- Phase 4: ⬜ / ✅ / ❌
- Final E2E: ⬜ / ✅ / ❌

**Final Conclusion:**
- ⬜ Ready to move on
- ⬜ Not ready - issues remain

---

## Notes

- هر Phase باید PASS شود قبل از رفتن به Phase بعد
- اگر Phase fail شد، باید مشکل را حل کنی و دوباره تست کنی
- Evidence برای هر Phase ضروری است
- Final E2E فقط بعد از PASS شدن همه Phases اجرا می‌شود

