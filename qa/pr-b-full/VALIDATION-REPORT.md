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
duration=1771.000000
```
duration_sec=1771.000

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
  Duration: 00:29:31.00, start: 0.000000, bitrate: 868 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt470bg/unknown/unknown, progressive), 1920x1080 [SAR 1:1 DAR 16:9], 732 kb/s, 25 fps, 25 tbr, 12800 tbn (default)
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
frame=    0 fps=0.0 q=-0.0 size=       0kB time=00:00:00.00 bitrate=N/A speed=   0x    frame=  598 fps=0.0 q=-0.0 size=N/A time=00:00:23.92 bitrate=N/A speed=46.1x    frame= 1111 fps=1090 q=-0.0 size=N/A time=00:00:44.44 bitrate=N/A speed=43.6x    frame= 1734 fps=1141 q=-0.0 size=N/A time=00:01:09.36 bitrate=N/A speed=45.7x    frame= 2399 fps=1188 q=-0.0 size=N/A time=00:01:35.96 bitrate=N/A speed=47.5x    frame= 3040 fps=1207 q=-0.0 size=N/A time=00:02:01.60 bitrate=N/A speed=48.3x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 117.28
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 122.36
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 137.76
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 142.84
frame= 3779 fps=1251 q=-0.0 size=N/A time=00:02:31.16 bitrate=N/A speed=  50x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 148
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 153.08
frame= 4370 fps=1241 q=-0.0 size=N/A time=00:02:54.80 bitrate=N/A speed=49.7x    frame= 5002 fps=1244 q=-0.0 size=N/A time=00:03:20.08 bitrate=N/A speed=49.7x    frame= 5657 fps=1251 q=-0.0 size=N/A time=00:03:46.28 bitrate=N/A speed=  50x    frame= 6307 fps=1256 q=-0.0 size=N/A time=00:04:12.28 bitrate=N/A speed=50.2x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 270.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 275.96
frame= 7022 fps=1271 q=-0.0 size=N/A time=00:04:40.88 bitrate=N/A speed=50.8x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 291.36
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 296.44
frame= 7721 fps=1281 q=-0.0 size=N/A time=00:05:08.84 bitrate=N/A speed=51.3x    frame= 8399 fps=1287 q=-0.0 size=N/A time=00:05:35.96 bitrate=N/A speed=51.5x    frame= 9032 fps=1284 q=-0.0 size=N/A time=00:06:01.28 bitrate=N/A speed=51.4x    frame= 9732 fps=1292 q=-0.0 size=N/A time=00:06:29.24 bitrate=N/A speed=51.7x    frame=10404 fps=1295 q=-0.0 size=N/A time=00:06:56.16 bitrate=N/A speed=51.8x    frame=11141 fps=1305 q=-0.0 size=N/A time=00:07:25.64 bitrate=N/A speed=52.2x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 460.32
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 465.4
frame=11797 fps=1306 q=-0.0 size=N/A time=00:07:51.88 bitrate=N/A speed=52.2x    frame=12482 fps=1309 q=-0.0 size=N/A time=00:08:19.24 bitrate=N/A speed=52.4x    frame=13139 fps=1309 q=-0.0 size=N/A time=00:08:45.56 bitrate=N/A speed=52.4x    frame=13768 fps=1307 q=-0.0 size=N/A time=00:09:10.72 bitrate=N/A speed=52.3x    frame=14387 fps=1304 q=-0.0 size=N/A time=00:09:35.48 bitrate=N/A speed=52.1x    frame=14993 fps=1300 q=-0.0 size=N/A time=00:09:59.72 bitrate=N/A speed=  52x    frame=15599 fps=1296 q=-0.0 size=N/A time=00:10:23.92 bitrate=N/A speed=51.8x    frame=16160 fps=1289 q=-0.0 size=N/A time=00:10:46.36 bitrate=N/A speed=51.6x    frame=16762 fps=1286 q=-0.0 size=N/A time=00:11:10.48 bitrate=N/A speed=51.4x    frame=17382 fps=1284 q=-0.0 size=N/A time=00:11:35.28 bitrate=N/A speed=51.3x    frame=18088 fps=1288 q=-0.0 size=N/A time=00:12:03.56 bitrate=N/A speed=51.5x    frame=18677 fps=1284 q=-0.0 size=N/A time=00:12:27.04 bitrate=N/A speed=51.4x    frame=19357 fps=1287 q=-0.0 size=N/A time=00:12:54.28 bitrate=N/A speed=51.5x    frame=20010 fps=1288 q=-0.0 size=N/A time=00:13:20.40 bitrate=N/A speed=51.5x    frame=20670 fps=1289 q=-0.0 size=N/A time=00:13:46.76 bitrate=N/A speed=51.5x    frame=21330 fps=1289 q=-0.0 size=N/A time=00:14:13.20 bitrate=N/A speed=51.6x    frame=22020 fps=1292 q=-0.0 size=N/A time=00:14:40.84 bitrate=N/A speed=51.7x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 900.64
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 905.72
frame=22741 fps=1296 q=-0.0 size=N/A time=00:15:09.64 bitrate=N/A speed=51.9x    frame=23416 fps=1298 q=-0.0 size=N/A time=00:15:36.64 bitrate=N/A speed=51.9x    frame=24087 fps=1299 q=-0.0 size=N/A time=00:16:03.44 bitrate=N/A speed=  52x    frame=24794 fps=1302 q=-0.0 size=N/A time=00:16:31.76 bitrate=N/A speed=52.1x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 992.8
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 997.88
frame=25486 fps=1304 q=-0.0 size=N/A time=00:16:59.44 bitrate=N/A speed=52.2x    frame=26199 fps=1307 q=-0.0 size=N/A time=00:17:27.96 bitrate=N/A speed=52.3x    frame=26885 fps=1309 q=-0.0 size=N/A time=00:17:55.36 bitrate=N/A speed=52.3x    frame=27585 fps=1311 q=-0.0 size=N/A time=00:18:23.36 bitrate=N/A speed=52.4x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1105.44
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1110.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1110.56
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1115.64
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1115.68
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1120.76
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1120.8
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1125.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1125.92
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1131
frame=28340 fps=1315 q=-0.0 size=N/A time=00:18:53.60 bitrate=N/A speed=52.6x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1136.16
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1141.24
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1146.4
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1151.48
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1151.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1156.6
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1156.64
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1161.72
frame=29121 fps=1321 q=-0.0 size=N/A time=00:19:24.84 bitrate=N/A speed=52.8x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1161.76
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1166.84
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1166.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1171.96
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1172
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1177.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1177.12
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1182.2
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1182.24
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1187.32
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1187.36
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1192.44
frame=29857 fps=1324 q=-0.0 size=N/A time=00:19:54.28 bitrate=N/A speed=  53x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1192.48
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1197.56
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1197.6
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1202.68
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1218.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1223.16
frame=30616 fps=1328 q=-0.0 size=N/A time=00:20:24.64 bitrate=N/A speed=53.1x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1233.44
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1238.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1238.56
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1243.64
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1243.68
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1248.76
frame=31360 fps=1332 q=-0.0 size=N/A time=00:20:54.40 bitrate=N/A speed=53.3x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1253.92
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1259
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1259.04
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1264.12
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1264.16
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1269.24
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1269.28
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1274.36
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1274.4
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1279.48
frame=32078 fps=1334 q=-0.0 size=N/A time=00:21:23.12 bitrate=N/A speed=53.4x    frame=32649 fps=1330 q=-0.0 size=N/A time=00:21:45.92 bitrate=N/A speed=53.2x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1305.12
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1310.2
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1310.24
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1315.32
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1315.36
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1320.44
frame=33335 fps=1331 q=-0.0 size=N/A time=00:22:13.40 bitrate=N/A speed=53.2x    frame=33986 fps=1330 q=-0.0 size=N/A time=00:22:39.44 bitrate=N/A speed=53.2x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1371.68
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1376.76
frame=34589 fps=1328 q=-0.0 size=N/A time=00:23:03.56 bitrate=N/A speed=53.1x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1381.92
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1387
frame=35250 fps=1328 q=-0.0 size=N/A time=00:23:30.00 bitrate=N/A speed=53.1x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1417.76
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1422.84
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1428
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1433.08
frame=35920 fps=1328 q=-0.0 size=N/A time=00:23:56.80 bitrate=N/A speed=53.1x    frame=36576 fps=1328 q=-0.0 size=N/A time=00:24:23.04 bitrate=N/A speed=53.1x    frame=37244 fps=1328 q=-0.0 size=N/A time=00:24:49.76 bitrate=N/A speed=53.1x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1489.44
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1494.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1494.56
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1499.64
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1509.92
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1515
frame=37952 fps=1329 q=-0.0 size=N/A time=00:25:18.08 bitrate=N/A speed=53.2x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1515.04
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1520.12
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1525.28
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1530.36
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1535.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1540.6
frame=38683 fps=1331 q=-0.0 size=N/A time=00:25:47.32 bitrate=N/A speed=53.3x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1550.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1555.96
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1556
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1561.08
frame=39388 fps=1333 q=-0.0 size=N/A time=00:26:15.52 bitrate=N/A speed=53.3x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1576.48
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1581.56
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1581.6
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1586.68
frame=40113 fps=1335 q=-0.0 size=N/A time=00:26:44.52 bitrate=N/A speed=53.4x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1602.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1607.16
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1607.2
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1612.28
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1617.44
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1622.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1622.56
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1627.56
frame=40841 fps=1337 q=-0.0 size=N/A time=00:27:13.64 bitrate=N/A speed=53.5x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1632.8
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1637.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1643.04
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1648.12
frame=41572 fps=1339 q=-0.0 size=N/A time=00:27:42.88 bitrate=N/A speed=53.5x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1663.52
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1668.6
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1673.76
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1678.84
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1678.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1683.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1684
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1689.08
frame=42308 fps=1341 q=-0.0 size=N/A time=00:28:12.32 bitrate=N/A speed=53.6x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1709.6
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1714.68
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1714.72
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1719.8
frame=43050 fps=1343 q=-0.0 size=N/A time=00:28:42.00 bitrate=N/A speed=53.7x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1719.84
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1724.92
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1735.2
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1740.28
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1740.32
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1745.4
frame=43723 fps=1343 q=-0.0 size=N/A time=00:29:08.92 bitrate=N/A speed=53.7x    [freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1760.8
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_duration: 5.08
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_end: 1765.88
[freezedetect @ 0x5615854bef00] lavfi.freezedetect.freeze_start: 1765.92
[out#0/null @ 0x5615853d8580] video:20754kB audio:0kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: unknown
frame=44275 fps=1344 q=-0.0 Lsize=N/A time=00:29:30.96 bitrate=N/A speed=53.7x
```

## volumedetect (60s windows)
| start_s | mean_volume_dB |
| --- | --- |
| 0 | -6.5 |
| 60 | -5.8 |
| 120 | -5.7 |
| 180 | -6 |
| 240 | -5.9 |
| 300 | -5.8 |
| 360 | -5.8 |
| 420 | -5.8 |
| 480 | -6.6 |
| 540 | -6.8 |
| 600 | -6.5 |
| 660 | -5.9 |
| 720 | -5.9 |
| 780 | -6.9 |
| 840 | -6.7 |
| 900 | -6.8 |
| 960 | -6.9 |
| 1020 | -6.6 |
| 1080 | -5.9 |
| 1140 | -5.9 |
| 1200 | -6.4 |
| 1260 | -6.3 |
| 1320 | -6.4 |
| 1380 | -6.4 |
| 1440 | -6.4 |
| 1500 | -6.4 |
| 1560 | -6.3 |
| 1620 | -6.4 |
| 1680 | -9.5 |

## contact sheet 6×6 (36 frames) → qa/pr-b-full/contact-sheet-6x6.jpg

**PASS**