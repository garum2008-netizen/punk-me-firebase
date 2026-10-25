# PR B recording validation
video: qa/pr-b-full/punk-me-ep-full-1080p.mp4

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
duration=1237.200000
```
duration_sec=1237.200

## freezedetect (n=0.003, d=5)
```
ffmpeg: /exec-daemon/tmux-root/lib/libncursesw.so.6: no version information available (required by /lib/x86_64-linux-gnu/libcaca.so.0)
ffmpeg: /exec-daemon/tmux-root/lib/libncursesw.so.6: no version information available (required by /lib/x86_64-linux-gnu/libcaca.so.0)
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'qa/pr-b-full/punk-me-ep-full-1080p.mp4':
  Metadata:
    major_brand     : isom
    minor_version   : 512
    compatible_brands: isomiso2avc1mp41
    encoder         : Lavf60.16.100
  Duration: 00:20:37.20, start: 0.000000, bitrate: 444 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt470bg/unknown/unknown, progressive), 1920x1080 [SAR 1:1 DAR 16:9], 307 kb/s, 25 fps, 25 tbr, 12800 tbn (default)
    Metadata:
      handler_name    : VideoHandler
      vendor_id       : [0][0][0][0]
      encoder         : Lavc60.31.102 libx264
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 96000 Hz, stereo, fltp, 126 kb/s (default)
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
frame=    0 fps=0.0 q=-0.0 size=       0kB time=00:00:00.00 bitrate=N/A speed=   0x    frame=  692 fps=0.0 q=-0.0 size=N/A time=00:00:27.68 bitrate=N/A speed=53.9x    frame= 1372 fps=1353 q=-0.0 size=N/A time=00:00:54.88 bitrate=N/A speed=54.1x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 70.36
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 75.44
frame= 2104 fps=1389 q=-0.0 size=N/A time=00:01:24.16 bitrate=N/A speed=55.6x    frame= 2799 fps=1389 q=-0.0 size=N/A time=00:01:51.96 bitrate=N/A speed=55.6x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 116.44
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 121.52
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 126.68
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 131.76
frame= 3562 fps=1417 q=-0.0 size=N/A time=00:02:22.48 bitrate=N/A speed=56.7x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 147.16
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 152.24
frame= 4277 fps=1419 q=-0.0 size=N/A time=00:02:51.08 bitrate=N/A speed=56.7x    frame= 4968 fps=1413 q=-0.0 size=N/A time=00:03:18.76 bitrate=N/A speed=56.5x    frame= 5697 fps=1418 q=-0.0 size=N/A time=00:03:47.88 bitrate=N/A speed=56.7x    frame= 6422 fps=1422 q=-0.0 size=N/A time=00:04:16.84 bitrate=N/A speed=56.9x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 259.8
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 264.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 270.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 275.12
frame= 7161 fps=1427 q=-0.0 size=N/A time=00:04:46.44 bitrate=N/A speed=57.1x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 300.76
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 305.84
frame= 7876 fps=1427 q=-0.0 size=N/A time=00:05:15.00 bitrate=N/A speed=57.1x    frame= 8523 fps=1416 q=-0.0 size=N/A time=00:05:40.96 bitrate=N/A speed=56.6x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 351.96
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 357.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 362.2
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 367.28
frame= 9206 fps=1412 q=-0.0 size=N/A time=00:06:08.24 bitrate=N/A speed=56.5x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 372.44
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 377.52
frame= 9902 fps=1410 q=-0.0 size=N/A time=00:06:36.08 bitrate=N/A speed=56.4x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 413.4
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 418.48
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 418.52
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 423.6
frame=10593 fps=1408 q=-0.0 size=N/A time=00:07:03.72 bitrate=N/A speed=56.3x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 423.64
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 428.72
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 428.76
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 433.84
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 433.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 438.96
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 439.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 444.08
frame=11332 fps=1413 q=-0.0 size=N/A time=00:07:33.24 bitrate=N/A speed=56.5x    frame=11998 fps=1408 q=-0.0 size=N/A time=00:07:59.92 bitrate=N/A speed=56.3x    frame=12652 fps=1402 q=-0.0 size=N/A time=00:08:26.04 bitrate=N/A speed=56.1x    frame=13318 fps=1398 q=-0.0 size=N/A time=00:08:52.72 bitrate=N/A speed=55.9x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 541.4
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 546.48
frame=14016 fps=1398 q=-0.0 size=N/A time=00:09:20.64 bitrate=N/A speed=55.9x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 582.36
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 587.44
frame=14739 fps=1400 q=-0.0 size=N/A time=00:09:49.52 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 602.84
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 607.88
frame=15436 fps=1399 q=-0.0 size=N/A time=00:10:17.44 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 613.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 618.16
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 623.32
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 628.4
frame=16137 fps=1400 q=-0.0 size=N/A time=00:10:45.48 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 643.8
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 648.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 664.28
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 669.36
frame=16798 fps=1396 q=-0.0 size=N/A time=00:11:11.92 bitrate=N/A speed=55.8x    frame=17495 fps=1396 q=-0.0 size=N/A time=00:11:39.84 bitrate=N/A speed=55.8x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 695
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 700.04
frame=18166 fps=1394 q=-0.0 size=N/A time=00:12:06.64 bitrate=N/A speed=55.8x    frame=18860 fps=1394 q=-0.0 size=N/A time=00:12:34.40 bitrate=N/A speed=55.7x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 761.56
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 766.64
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 766.68
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 771.76
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 771.8
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 776.88
frame=19543 fps=1392 q=-0.0 size=N/A time=00:13:01.72 bitrate=N/A speed=55.7x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 776.92
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 782
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 782.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 787.12
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 787.16
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 792.24
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 792.28
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 797.36
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 802.52
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 807.6
frame=20279 fps=1395 q=-0.0 size=N/A time=00:13:31.16 bitrate=N/A speed=55.8x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 807.64
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 812.72
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 812.76
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 817.84
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 817.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 822.96
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 823
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 828.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 828.12
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 833.2
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 833.24
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 838.32
frame=21016 fps=1398 q=-0.0 size=N/A time=00:14:00.64 bitrate=N/A speed=55.9x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 838.36
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 843.44
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 843.48
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 848.56
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 848.6
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 853.68
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 853.72
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 858.8
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 858.84
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 863.92
frame=21764 fps=1401 q=-0.0 size=N/A time=00:14:30.56 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 874.2
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 879.28
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 879.32
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 884.4
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 889.56
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 894.64
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 894.68
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 899.76
frame=22494 fps=1402 q=-0.0 size=N/A time=00:14:59.76 bitrate=N/A speed=56.1x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 899.8
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 904.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 904.92
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 910
frame=23178 fps=1401 q=-0.0 size=N/A time=00:15:27.12 bitrate=N/A speed=56.1x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 935.64
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.04
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 940.68
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 940.76
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 945.84
frame=23869 fps=1401 q=-0.0 size=N/A time=00:15:54.76 bitrate=N/A speed=  56x    frame=24500 fps=1397 q=-0.0 size=N/A time=00:16:20.04 bitrate=N/A speed=55.9x    frame=25172 fps=1395 q=-0.0 size=N/A time=00:16:46.88 bitrate=N/A speed=55.8x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1012.44
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1017.52
frame=25863 fps=1395 q=-0.0 size=N/A time=00:17:14.48 bitrate=N/A speed=55.8x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1032.92
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1038
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1043.16
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1048.24
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1053.4
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1058.48
frame=26568 fps=1395 q=-0.0 size=N/A time=00:17:42.72 bitrate=N/A speed=55.8x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1073.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1078.96
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1084.12
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1089.2
frame=27281 fps=1396 q=-0.0 size=N/A time=00:18:11.24 bitrate=N/A speed=55.8x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1094.36
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1099.44
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1104.6
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1109.68
frame=28004 fps=1397 q=-0.0 size=N/A time=00:18:40.16 bitrate=N/A speed=55.9x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1125.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1130.16
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1130.2
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1135.28
frame=28749 fps=1399 q=-0.0 size=N/A time=00:19:09.96 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1155.8
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1160.88
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1160.92
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1166
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1171.16
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1176.24
frame=29456 fps=1400 q=-0.0 size=N/A time=00:19:38.20 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1181.4
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1186.48
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1191.64
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1196.72
frame=30153 fps=1400 q=-0.0 size=N/A time=00:20:06.08 bitrate=N/A speed=  56x    [freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_start: 1212.12
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x55fd5f0e2400] lavfi.freezedetect.freeze_end: 1217.2
frame=30846 fps=1399 q=-0.0 size=N/A time=00:20:33.84 bitrate=N/A speed=  56x    [out#0/null @ 0x55fd5e92f4c0] video:14498kB audio:0kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: unknown
frame=30930 fps=1399 q=-0.0 Lsize=N/A time=00:20:37.16 bitrate=N/A speed=  56x
```

## volumedetect (60s windows)
| start_s | mean_volume_dB |
| --- | --- |
| 0 | -6.6 |
| 60 | -5.8 |
| 120 | -5.7 |
| 180 | -6.1 |
| 240 | -6 |
| 300 | -6.4 |
| 360 | -6.9 |
| 420 | -7 |
| 480 | -7 |
| 540 | -7 |
| 600 | -7 |
| 660 | -7.1 |
| 720 | -6.1 |
| 780 | -6 |
| 840 | -6.4 |
| 900 | -6.3 |
| 960 | -6.5 |
| 1020 | -6.4 |
| 1080 | -6.5 |
| 1140 | -6.3 |

## contact sheet 6×6 (36 frames) → qa/pr-b-full/contact-sheet-6x6.jpg

**PASS**