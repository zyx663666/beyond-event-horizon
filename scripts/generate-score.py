"""Generate the original synthesized score for Beyond the Light Cone.

Produces `public/audio/score.mp3` (426 s stereo, matching the full film clock).
The score is generated programmatically by this script: original work with no
third-party rights, which is why `publishAllowed` may be set to true.

Usage:  python scripts/generate-score.py
Requires: numpy, lameenc (pip install numpy lameenc)
"""
from __future__ import annotations

import numpy as np
import lameenc

SR = 44100
DURATION = 426.0
N = int(SR * DURATION)
T = np.arange(N, dtype=np.float64) / SR

ROOT = 55.0          # A1

mix_l = np.zeros(N)
mix_r = np.zeros(N)


def smooth(a: float, b: float, t: np.ndarray) -> np.ndarray:
    """Same smoothstep easing the film timeline uses."""
    x = np.clip((t - a) / (b - a), 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def auto(points: list[tuple[float, float]]) -> np.ndarray:
    """Piecewise-linear amplitude automation over the film clock."""
    times = [p[0] for p in points]
    values = [p[1] for p in points]
    return np.interp(T, times, values)


def tone(freq: float, detune: float = 0.0015, phase: float = 0.0):
    """Detuned stereo pair -> slow beating movement."""
    left = np.sin(2 * np.pi * freq * (1 - detune) * T + phase)
    right = np.sin(2 * np.pi * freq * (1 + detune) * T + phase)
    return left, right


def chirp(freq: np.ndarray):
    """Frequency array over time (for rising drones)."""
    phase = 2 * np.pi * np.cumsum(freq) / SR
    left = np.sin(phase)
    right = np.sin(phase + 0.06)
    return left, right


def add(left: np.ndarray, right: np.ndarray, gain_l, gain_r):
    """Mix one layer in immediately; temporaries are released by the caller."""
    global mix_l, mix_r
    mix_l += left * (gain_l if np.ndim(gain_l) else 1.0)
    mix_r += right * (gain_r if np.ndim(gain_r) else 1.0)


# 1. Sub drone A1 — present nearly throughout, the score's floor.
l, r = tone(ROOT)
add(l, r, auto([(0, 0.0), (6, 0.30), (140, 0.26), (152, 0.20), (322, 0.20),
                (327, 0.0), (327.2, 0.0), (340, 0.16), (426, 0.20), (462, 0.24)]),
    auto([(0, 0.0), (6, 0.30), (140, 0.26), (152, 0.20), (322, 0.20),
          (327, 0.0), (327.2, 0.0), (340, 0.16), (426, 0.20), (462, 0.24)]))
del l, r

# Fifth above, entering with the departure.
env = auto([(0, 0.0), (20, 0.16), (144, 0.13), (152, 0.10), (322, 0.10),
            (327, 0.0), (327.2, 0.0), (345, 0.10), (462, 0.13)])
l, r = tone(ROOT * 1.5)
add(l, r, env, env)
del l, r, env

# 2. Rising approach drone 249-327: A -> B (one whole step of dread).
freq = np.full(N, ROOT * 2.0)
freq += smooth(249, 327, T) * (ROOT * 2.0 * 2 / 12)          # up a major second
env = auto([(0, 0.0), (249, 0.0), (300, 0.10), (322, 0.16), (327, 0.0), (327.2, 0.0), (462, 0.0)])
l, r = chirp(freq)
add(l, r, env, env)
del l, r, env, freq

# 3. Tritone tension cluster (A + Eb), the black-hole dissonance.
env = auto([(0, 0.0), (152, 0.0), (170, 0.09), (249, 0.10), (322, 0.15), (327, 0.0), (327.2, 0.0), (462, 0.0)])
l, r = tone(ROOT * 2 ** 6 / 12)                              # tritone above A1
add(l, r, env, env)
del l, r, env
env = auto([(0, 0.0), (187, 0.0), (215, 0.05), (322, 0.10), (327, 0.0), (327.2, 0.0), (462, 0.0)])
l, r = tone((ROOT * 2 ** 6 / 12) * 2, detune=0.002)
add(l, r, env, env)
del l, r, env

# 4. Chord pads — harmonic colour for departure and epilogue.
CHORDS = [
    (36, 84,  [110.0, 164.81, 220.0, 246.94, 329.63], 0.040),   # Am9
    (60, 108, [87.31, 130.81, 174.61, 220.0, 261.63], 0.040),   # Fmaj7
    (84, 130, [98.0, 146.83, 196.0, 293.66], 0.040),            # Gsus2
    (108, 144, [110.0, 164.81, 220.0, 261.63], 0.038),          # Am7
    (370, 426, [130.81, 196.0, 261.63, 329.63, 392.0], 0.042),  # Cmaj9
]
for start, end, freqs, amp in CHORDS:
    atk = rel = min(9.0, (end - start) * 0.3)
    env = smooth(start, start + atk, T) * (1.0 - smooth(end - rel, end, T))
    for i, f in enumerate(freqs):
        wob = 0.04 * np.sin(2 * np.pi * 0.07 * T + i) + 0.96   # slow breathing
        l, r = tone(f, detune=0.002, phase=0.7 * i)
        add(l, r, env * amp * wob, env * amp * wob)
        del l, r
    del env, wob

# 5. Shimmer — a faint high partial marking the title and the echoes.
env = auto([(0, 0.0), (12, 0.0), (24, 0.012), (140, 0.012), (152, 0.0),
            (340, 0.0), (352, 0.020), (420, 0.020), (462, 0.014)])
am = 0.6 + 0.4 * np.sin(2 * np.pi * 0.1 * T)
l, r = tone(1318.51, detune=0.003, phase=1.3)
add(l, r, env * am, env * am)
del l, r, env, am

# 6. Airy noise pad — band-limited breath of the vacuum.
rng = np.random.default_rng(20261004)
noise = rng.standard_normal(N)
band = np.zeros(N)
CHUNK = SR * 90
window = np.hanning(CHUNK * 2)
for i in range(0, N, CHUNK):
    seg = noise[i:i + CHUNK * 2]
    if seg.size < CHUNK * 2:
        seg = np.pad(seg, (0, CHUNK * 2 - seg.size))
    spec = np.fft.rfft(seg * window)
    freqs = np.fft.rfftfreq(seg.size, 1 / SR)
    spec *= np.exp(-0.5 * ((np.log(freqs + 1) - np.log(700)) / 0.95) ** 2)  # log-gaussian band
    filtered = np.fft.irfft(spec, seg.size) * window
    n = min(filtered.size, N - i)
    band[i:i + n] += filtered[:n]
del noise, spec, freqs
band = band[:N]
band /= np.max(np.abs(band)) + 1e-9
env = auto([(0, 0.0), (30, 0.0), (60, 0.022), (130, 0.022), (144, 0.012),
            (152, 0.0), (249, 0.018), (322, 0.034), (327, 0.0), (327.2, 0.0),
            (345, 0.014), (450, 0.014), (462, 0.010)])
add(band, band * 0.92, env, env)
del band, env, window

# 7. Sub pulses — departure heartbeat accelerating toward the horizon.
pulse = np.zeros(N)
t_cursor, interval = 36.0, 16.0
while t_cursor < 327:
    interval = 16.0 - 14.0 * smooth(36, 322, np.array(t_cursor)) ** 1.6
    length = int(min(2.4, interval * 0.8) * SR)
    if t_cursor + length / SR < 328:
        idx = int(t_cursor * SR)
        tt = np.arange(length) / SR
        pulse[idx:idx + length] += np.exp(-tt * 2.2) * np.sin(2 * np.pi * 40 * tt) * 0.5
    t_cursor += interval
env = auto([(0, 0.0), (36, 0.0), (60, 0.16), (215, 0.14), (322, 0.18), (327, 0.0), (327.2, 0.0), (462, 0.0)])
add(pulse, pulse, env, env)
del pulse, env

# 8. Muffled heartbeat through the crossing 327-340.
heart = np.zeros(N)
t_cursor = 327.6
while t_cursor < 340:
    idx = int(t_cursor * SR)
    length = int(1.6 * SR)
    if idx + length < N:
        tt = np.arange(length) / SR
        heart[idx:idx + length] += (np.exp(-tt * 3.2) * np.sin(2 * np.pi * 40 * tt)
                                    + 0.5 * np.exp(-tt * 4.0) * np.sin(2 * np.pi * 80 * tt)) * 0.30
    t_cursor += 1.2
add(heart, heart, np.ones(N), np.ones(N))
del heart

# 9. Debris strikes 215-249 — filtered noise hits, alternating pan.
hits = np.zeros(N)
pan_alt = 1.0
t_cursor = 216.0
while t_cursor < 248:
    idx = int(t_cursor * SR)
    length = int(1.1 * SR)
    if idx + length < N:
        tt = np.arange(length) / SR
        burst = np.convolve(rng.standard_normal(length), np.ones(96) / 96, mode="same")
        hits[idx:idx + length] += burst * np.exp(-tt * 5.0) * pan_alt
    pan_alt *= -0.8
    t_cursor += 3.5
hits /= np.max(np.abs(hits)) + 1e-9
env = auto([(0, 0.0), (215, 0.0), (218, 0.05), (245, 0.05), (249, 0.0), (462, 0.0)])
add(hits, -hits * 0.25, env, env)
del hits, env

# 10. Crossing swell + drop — everything converges, then silence.
env = auto([(0, 0.0), (322, 0.0), (326.4, 0.22), (327.0, 0.30), (327.15, 0.0), (462, 0.0)])
l, r = tone(ROOT * 4, detune=0.004)
add(l, r, env, env)
del l, r, env


# 11. Last echoes 340-370 — bell tones with feedback delay.
def bell(freq: float, when: float, amp: float, pan: float):
    length = int(14 * SR)
    idx = int(when * SR)
    length = min(length, N - idx)
    tt = np.arange(length) / SR
    sig = (np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 1.1)
           + 0.55 * np.sin(2 * np.pi * freq * 2.756 * tt) * np.exp(-tt * 2.2)
           + 0.22 * np.sin(2 * np.pi * freq * 5.404 * tt) * np.exp(-tt * 4.0))
    echo = np.zeros(length)
    for k in range(5):
        shift = int(k * 0.9 * SR)
        echo[shift:] += sig[:length - shift] * (0.45 ** k)
    echo /= np.max(np.abs(echo)) + 1e-9
    echo *= amp
    l_buf = np.zeros(N)
    r_buf = np.zeros(N)
    l_buf[idx:idx + length] += echo * (1.0 - pan) * 2
    r_buf[idx:idx + length] += echo * pan * 2
    add(l_buf, r_buf, np.ones(N), np.ones(N))


bell(440.0, 344.0, 0.050, 0.3)
bell(659.26, 352.0, 0.042, 0.7)
bell(587.33, 361.0, 0.038, 0.25)
bell(440.0, 367.5, 0.030, 0.6)

# 12. Choir for the artistic epilogue — vibrato detuned voices.
for f, start, end, amp, ph in [
    (261.63, 370, 426, 0.026, 0.0), (196.0, 376, 426, 0.024, 1.1),
    (329.63, 382, 426, 0.022, 2.2), (293.66, 390, 426, 0.020, 3.3),
    (493.88, 398, 426, 0.016, 4.4),
]:
    env = smooth(start, start + 10, T) * (1.0 - smooth(end - 10, end, T))
    vib = np.sin(2 * np.pi * 4.6 * T + ph) * 0.004
    l = np.sin(2 * np.pi * f * T * (1 - 0.0012) + vib + ph)
    r = np.sin(2 * np.pi * f * T * (1 + 0.0012) + vib * 0.8 + ph)
    add(l, r, env * amp, env * amp)
    del l, r
    del env, vib

# ---------- mixdown ----------
peak = max(np.max(np.abs(mix_l)), np.max(np.abs(mix_r)))
mix_l *= 0.88 / peak
mix_r *= 0.88 / peak
pcm = np.empty(N * 2, dtype=np.int16)
pcm[0::2] = np.clip(mix_l * 32767, -32768, 32767).astype(np.int16)
pcm[1::2] = np.clip(mix_r * 32767, -32768, 32767).astype(np.int16)
del mix_l, mix_r, T

encoder = lameenc.Encoder()
encoder.set_bit_rate(160)
encoder.set_in_sample_rate(SR)
encoder.set_channels(2)
encoder.set_quality(2)
mp3 = encoder.encode(pcm.tobytes()) + encoder.flush()
del pcm

out = "public/audio/score.mp3"
with open(out, "wb") as fh:
    fh.write(mp3)
print(f"wrote {out}: {len(mp3) / 1e6:.1f} MB, {DURATION:.0f} s, peak {peak:.3f}")
