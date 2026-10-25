# PR B recording validation
video: /workspace/qa/pr-b-full/punk-me-ep-full-1080p.mp4

## ffprobe
```
codec_name=h264
codec_type=video
width=1920
height=1080
r_frame_rate=25/1
codec_name=aac
codec_type=audio
r_frame_rate=0/0
duration=1060.287000
```
duration_sec=1060.287

## freezedetect (n=0.003, d=5)
```
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/workspace/qa/pr-b-full/punk-me-ep-full-1080p.mp4':
  Metadata:
    major_brand     : isom
    minor_version   : 512
    compatible_brands: isomiso2avc1mp41
    encoder         : Lavf60.16.100
  Duration: 00:17:40.29, start: 0.000000, bitrate: 524 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt470bg/unknown/unknown, progressive), 1920x1080 [SAR 1:1 DAR 16:9], 392 kb/s, 25 fps, 25 tbr, 12800 tbn (default)
    Metadata:
      handler_name    : VideoHandler
      vendor_id       : [0][0][0][0]
      encoder         : Lavc60.31.102 libx264
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 96000 Hz, stereo, fltp, 122 kb/s (default)
    Metadata:
      handler_name    : SoundHandler
      vendor_id       : [0][0][0][0]
Stream mapping:
  Stream #0:0 -> #0:0 (h264 (native) -> wrapped_avframe (native))
Press [q] to stop, [?] for help
Output #0, null, to 'pipe:':
  Metadata:
    major_brand     : isom
    minor_version   : 512
    compatible_brands: isomiso2avc1mp41
    encoder         : Lavf60.16.100
  Stream #0:0(und): Video: wrapped_avframe, yuv420p(tv, bt470bg/unknown/unknown, progressive), 1920x1080 [SAR 1:1 DAR 16:9], q=2-31, 200 kb/s, 25 fps, 25 tbn (default)
    Metadata:
      handler_name    : VideoHandler
      vendor_id       : [0][0][0][0]
      encoder         : Lavc60.31.102 wrapped_avframe
frame=    0 fps=0.0 q=-0.0 size=       0kB time=00:00:00.00 bitrate=N/A speed=   0x    frame=  640 fps=0.0 q=-0.0 size=N/A time=00:00:25.60 bitrate=N/A speed=49.8x    frame= 1303 fps=1284 q=-0.0 size=N/A time=00:00:52.12 bitrate=N/A speed=51.4x    frame= 2021 fps=1334 q=-0.0 size=N/A time=00:01:20.84 bitrate=N/A speed=53.3x    frame= 2714 fps=1346 q=-0.0 size=N/A time=00:01:48.56 bitrate=N/A speed=53.8x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 118.76
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 123.84
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 129
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 134.08
frame= 3432 fps=1363 q=-0.0 size=N/A time=00:02:17.24 bitrate=N/A speed=54.5x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 149.48
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 154.56
frame= 4114 fps=1363 q=-0.0 size=N/A time=00:02:44.56 bitrate=N/A speed=54.5x    frame= 4786 fps=1360 q=-0.0 size=N/A time=00:03:11.44 bitrate=N/A speed=54.4x    frame= 5479 fps=1363 q=-0.0 size=N/A time=00:03:39.16 bitrate=N/A speed=54.5x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 241.64
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 246.72
frame= 6195 fps=1370 q=-0.0 size=N/A time=00:04:07.80 bitrate=N/A speed=54.8x    frame= 6868 fps=1368 q=-0.0 size=N/A time=00:04:34.72 bitrate=N/A speed=54.7x    frame= 7576 fps=1372 q=-0.0 size=N/A time=00:05:03.04 bitrate=N/A speed=54.9x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 318.44
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 323.52
frame= 8335 fps=1384 q=-0.0 size=N/A time=00:05:33.36 bitrate=N/A speed=55.4x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 328.68
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 333.76
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 333.8
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 338.88
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 349.24
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 354.24
frame= 9092 fps=1394 q=-0.0 size=N/A time=00:06:03.68 bitrate=N/A speed=55.7x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 364.56
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.04
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 369.6
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 385
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 390.08
frame= 9852 fps=1403 q=-0.0 size=N/A time=00:06:34.08 bitrate=N/A speed=56.1x    frame=10613 fps=1410 q=-0.0 size=N/A time=00:07:04.56 bitrate=N/A speed=56.4x    frame=11292 fps=1407 q=-0.0 size=N/A time=00:07:31.68 bitrate=N/A speed=56.3x    frame=11955 fps=1402 q=-0.0 size=N/A time=00:07:58.20 bitrate=N/A speed=56.1x    frame=12598 fps=1396 q=-0.0 size=N/A time=00:08:23.92 bitrate=N/A speed=55.8x    frame=13290 fps=1395 q=-0.0 size=N/A time=00:08:51.60 bitrate=N/A speed=55.8x    frame=13990 fps=1395 q=-0.0 size=N/A time=00:09:19.60 bitrate=N/A speed=55.8x    frame=14687 fps=1395 q=-0.0 size=N/A time=00:09:47.48 bitrate=N/A speed=55.8x    frame=15430 fps=1399 q=-0.0 size=N/A time=00:10:17.20 bitrate=N/A speed=  56x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 615.4
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 620.48
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 625.64
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 630.72
frame=16075 fps=1394 q=-0.0 size=N/A time=00:10:42.96 bitrate=N/A speed=55.8x    frame=16740 fps=1391 q=-0.0 size=N/A time=00:11:09.60 bitrate=N/A speed=55.6x    frame=17421 fps=1390 q=-0.0 size=N/A time=00:11:36.84 bitrate=N/A speed=55.6x    frame=18060 fps=1386 q=-0.0 size=N/A time=00:12:02.40 bitrate=N/A speed=55.4x    frame=18673 fps=1379 q=-0.0 size=N/A time=00:12:26.92 bitrate=N/A speed=55.2x    frame=19360 fps=1379 q=-0.0 size=N/A time=00:12:54.40 bitrate=N/A speed=55.2x    frame=20017 fps=1377 q=-0.0 size=N/A time=00:13:20.68 bitrate=N/A speed=55.1x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 804.84
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 809.92
frame=20742 fps=1379 q=-0.0 size=N/A time=00:13:49.68 bitrate=N/A speed=55.2x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 835.56
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 840.64
frame=21453 fps=1381 q=-0.0 size=N/A time=00:14:18.12 bitrate=N/A speed=55.2x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 881.68
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.04
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 886.72
frame=22183 fps=1383 q=-0.0 size=N/A time=00:14:47.32 bitrate=N/A speed=55.3x    frame=22852 fps=1382 q=-0.0 size=N/A time=00:15:14.04 bitrate=N/A speed=55.3x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 912.36
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 917.44
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 922.6
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 927.68
frame=23574 fps=1383 q=-0.0 size=N/A time=00:15:42.96 bitrate=N/A speed=55.3x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 953.32
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 958.4
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 963.56
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 968.64
frame=24315 fps=1386 q=-0.0 size=N/A time=00:16:12.60 bitrate=N/A speed=55.4x    [freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 984.04
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 989.12
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_start: 994.28
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55713810b980] lavfi.freezedetect.freeze_end: 999.36
frame=25013 fps=1386 q=-0.0 size=N/A time=00:16:40.52 bitrate=N/A speed=55.5x    frame=25699 fps=1386 q=-0.0 size=N/A time=00:17:07.96 bitrate=N/A speed=55.4x    frame=26396 fps=1386 q=-0.0 size=N/A time=00:17:35.80 bitrate=N/A speed=55.4x    [out#0/null @ 0x557137978540] video:12425kB audio:0kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: unknown
frame=26507 fps=1386 q=-0.0 Lsize=N/A time=00:17:40.24 bitrate=N/A speed=55.4x
```

## volumedetect (60s windows)
| start_s | mean_volume_dB |
| --- | --- |
| 0 | -7.1 |
| 60 | -6.4 |
| 120 | -6.2 |
| 180 | -6.6 |
| 240 | -6.3 |
| 300 | -6.3 |
| 360 | -7 |
| 420 | -7.6 |
| 480 | -7.6 |
| 540 | -6.3 |
| 600 | -6.3 |
| 660 | -6.9 |
| 720 | -6.9 |
| 780 | -6.8 |
| 840 | -6.8 |
| 900 | -6.8 |
| 960 | -8.6 |

## contact sheet 6×6 (36 frames) → /workspace/qa/pr-b-full/contact-sheet-6x6.jpg

**PASS**