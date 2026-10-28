'use strict';
// GitHub Pagesでは公開先のユーザー名・リポジトリ名を自動判定します。
const fallback = { owner: 'poetsakihana', repo: 'game-no-mori' };
const pathRepo = location.pathname.split('/').filter(Boolean)[0];
const onPages = location.hostname.endsWith('.github.io');
const owner = onPages ? location.hostname.split('.')[0] : fallback.owner;
const repo = onPages && pathRepo ? pathRepo : fallback.repo;
const repoURL = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
const $ = s => document.querySelector(s);
const DRIVE_GAMES = [
  {
    "id": "drive-1yweOJdMQ63L0uofrzpBxT_7Y39F8qp2r",
    "title": "04.8番入口-v1.2",
    "name": "04.8番入口-v1.2.apk",
    "size": 1102357,
    "date": "2026-10-28T07:57:21.976Z",
    "url": "https://drive.google.com/file/d/1yweOJdMQ63L0uofrzpBxT_7Y39F8qp2r/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1yweOJdMQ63L0uofrzpBxT_7Y39F8qp2r/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1zycFZ8LN_qIBL7ZGciwFkzMZmMlN8uDk",
    "title": "21.Voice_Life_v7",
    "name": "21.Voice_Life_v7.apk",
    "size": 37397,
    "date": "2026-10-28T07:57:21.976Z",
    "url": "https://drive.google.com/file/d/1zycFZ8LN_qIBL7ZGciwFkzMZmMlN8uDk/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1zycFZ8LN_qIBL7ZGciwFkzMZmMlN8uDk/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1y2zAjGTr32T0Z1cYYHv-eD6Z9P3gqEb5",
    "title": "39.わらい座-v1.4",
    "name": "39.わらい座-v1.4.apk",
    "size": 123878,
    "date": "2026-10-28T07:57:21.976Z",
    "url": "https://drive.google.com/file/d/1y2zAjGTr32T0Z1cYYHv-eD6Z9P3gqEb5/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1y2zAjGTr32T0Z1cYYHv-eD6Z9P3gqEb5/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1pH00yNIhvjQTvuIpDkwkKPzAqDewLqPJ",
    "title": "05.Can-to-Crown-v2.1",
    "name": "05.Can-to-Crown-v2.1.apk",
    "size": 33260,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1pH00yNIhvjQTvuIpDkwkKPzAqDewLqPJ/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1pH00yNIhvjQTvuIpDkwkKPzAqDewLqPJ/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1qdT5AoqoVmMrWDxMwYUMNLSiKe7r6J1T",
    "title": "13.全国ことばRPG-v2.1",
    "name": "13.全国ことばRPG-v2.1.apk",
    "size": 11792292,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1qdT5AoqoVmMrWDxMwYUMNLSiKe7r6J1T/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1qdT5AoqoVmMrWDxMwYUMNLSiKe7r6J1T/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1wUq_pHku2aEKzHCYPKfIpW99CYk_psXI",
    "title": "14.リズム天国_v1.5",
    "name": "14.リズム天国_v1.5.apk",
    "size": 342352,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1wUq_pHku2aEKzHCYPKfIpW99CYk_psXI/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1wUq_pHku2aEKzHCYPKfIpW99CYk_psXI/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1uZYmHXW2hxyxJudZ-UtbS-UQUyDBnp-b",
    "title": "24.もくもく探検隊Ver.1.0",
    "name": "24.もくもく探検隊Ver.1.0.apk",
    "size": 33260053,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1uZYmHXW2hxyxJudZ-UtbS-UQUyDBnp-b/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1uZYmHXW2hxyxJudZ-UtbS-UQUyDBnp-b/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1xYiaVJJFry2TaNtIRl-Y-78IUjK05zwI",
    "title": "29.恋愛作戦-v0.2.0",
    "name": "29.恋愛作戦-v0.2.0.apk",
    "size": 16639144,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1xYiaVJJFry2TaNtIRl-Y-78IUjK05zwI/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1xYiaVJJFry2TaNtIRl-Y-78IUjK05zwI/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1pEz0vBVu6oNHDmBh7zrJvsVAHKsRT_6L",
    "title": "30.ロックマンコレクション_縦横アクション_v1_3",
    "name": "30.ロックマンコレクション_縦横アクション_v1_3.apk",
    "size": 10557065,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1pEz0vBVu6oNHDmBh7zrJvsVAHKsRT_6L/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1pEz0vBVu6oNHDmBh7zrJvsVAHKsRT_6L/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1oYdAEdyBia9tg97FcFzpf6uRVdz8X5mA",
    "title": "35.FryFriends-0.3.0",
    "name": "35.FryFriends-0.3.0.apk",
    "size": 27824701,
    "date": "2026-10-28T07:57:21.975Z",
    "url": "https://drive.google.com/file/d/1oYdAEdyBia9tg97FcFzpf6uRVdz8X5mA/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1oYdAEdyBia9tg97FcFzpf6uRVdz8X5mA/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1i5P_9LG7v5af9AH7BmWXW8WlK2xjtA91",
    "title": "11.全国CM_v2.2",
    "name": "11.全国CM_v2.2.apk",
    "size": 5113954,
    "date": "2026-10-28T07:57:21.974Z",
    "url": "https://drive.google.com/file/d/1i5P_9LG7v5af9AH7BmWXW8WlK2xjtA91/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1i5P_9LG7v5af9AH7BmWXW8WlK2xjtA91/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1jhZlo5FAhaVszzEw3LCppitKuBOD3bRb",
    "title": "32.StarBolt",
    "name": "32.StarBolt.apk",
    "size": 17003,
    "date": "2026-10-28T07:57:21.974Z",
    "url": "https://drive.google.com/file/d/1jhZlo5FAhaVszzEw3LCppitKuBOD3bRb/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1jhZlo5FAhaVszzEw3LCppitKuBOD3bRb/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1n0j3PZwenPkgUlE6r95RLsV8w5uDdasP",
    "title": "36.Reリズム天国-v0.3.0",
    "name": "36.Reリズム天国-v0.3.0.apk",
    "size": 2663251,
    "date": "2026-10-28T07:57:21.974Z",
    "url": "https://drive.google.com/file/d/1n0j3PZwenPkgUlE6r95RLsV8w5uDdasP/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1n0j3PZwenPkgUlE6r95RLsV8w5uDdasP/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1oJ313rHTleSZQ1Nu_xf-9Qb54p47tv_x",
    "title": "39.わらい座150-v1.6",
    "name": "39.わらい座150-v1.6.apk",
    "size": 369774,
    "date": "2026-10-28T07:57:21.974Z",
    "url": "https://drive.google.com/file/d/1oJ313rHTleSZQ1Nu_xf-9Qb54p47tv_x/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1oJ313rHTleSZQ1Nu_xf-9Qb54p47tv_x/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1f5dwfhdWOWvqnfoQAR0kE43H9ipPS3H2",
    "title": "07.フライバトル",
    "name": "07.フライバトル.apk",
    "size": 381393,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1f5dwfhdWOWvqnfoQAR0kE43H9ipPS3H2/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1f5dwfhdWOWvqnfoQAR0kE43H9ipPS3H2/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1_1pRv2Mx91_0sw8qhyhiyKvEPxhN6rD3",
    "title": "09.イライラ棒-v1.0",
    "name": "09.イライラ棒-v1.0.apk",
    "size": 25046,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1_1pRv2Mx91_0sw8qhyhiyKvEPxhN6rD3/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1_1pRv2Mx91_0sw8qhyhiyKvEPxhN6rD3/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1fHLj5aaa9WrAPz-GKjTbgWpA3_kHbZsz",
    "title": "12.自販機伝説RPG",
    "name": "12.自販機伝説RPG.apk",
    "size": 168440942,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1fHLj5aaa9WrAPz-GKjTbgWpA3_kHbZsz/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1fHLj5aaa9WrAPz-GKjTbgWpA3_kHbZsz/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1_kDDD-CmWo63KdIGausGEST-U4V20sw_",
    "title": "14.リズム天国master",
    "name": "14.リズム天国master.apk",
    "size": 786966,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1_kDDD-CmWo63KdIGausGEST-U4V20sw_/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1_kDDD-CmWo63KdIGausGEST-U4V20sw_/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1U7oIOIKWESH804dOdwRVoyIVCCKqC3gs",
    "title": "27.Battlitia-v1.1",
    "name": "27.Battlitia-v1.1.apk",
    "size": 25133,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1U7oIOIKWESH804dOdwRVoyIVCCKqC3gs/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1U7oIOIKWESH804dOdwRVoyIVCCKqC3gs/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1hp3-ghJ5-I6PtEsBx-RxJtE7-G0W29S3",
    "title": "38.干支大レース-3d-v0.2",
    "name": "38.干支大レース-3d-v0.2.apk",
    "size": 37406,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1hp3-ghJ5-I6PtEsBx-RxJtE7-G0W29S3/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1hp3-ghJ5-I6PtEsBx-RxJtE7-G0W29S3/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1eRBH2fWNsIln0ZLwf29tLDoQDid7rHUr",
    "title": "40.千客万来落語-150-500-v2.3",
    "name": "40.千客万来落語-150-500-v2.3.apk",
    "size": 1082339,
    "date": "2026-10-28T07:57:21.973Z",
    "url": "https://drive.google.com/file/d/1eRBH2fWNsIln0ZLwf29tLDoQDid7rHUr/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1eRBH2fWNsIln0ZLwf29tLDoQDid7rHUr/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1Sn_f37QMETW91vmxNbCI68DlLNqoxKkJ",
    "title": "04.8番入口-v1.0.0",
    "name": "04.8番入口-v1.0.0.apk",
    "size": 21037,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/1Sn_f37QMETW91vmxNbCI68DlLNqoxKkJ/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1Sn_f37QMETW91vmxNbCI68DlLNqoxKkJ/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1PYlLhpJIc_eJ12JTjPCEe5zf_M8bb1hN",
    "title": "08.Instant_4.3.1",
    "name": "08.Instant_4.3.1.apk",
    "size": 47434508,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/1PYlLhpJIc_eJ12JTjPCEe5zf_M8bb1hN/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1PYlLhpJIc_eJ12JTjPCEe5zf_M8bb1hN/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1G34pBtP-mQMYY3sQ5Yg7HEYyUcU7GjJp",
    "title": "18.グラスマ_1.1.0",
    "name": "18.グラスマ_1.1.0.apk",
    "size": 68153981,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/1G34pBtP-mQMYY3sQ5Yg7HEYyUcU7GjJp/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1G34pBtP-mQMYY3sQ5Yg7HEYyUcU7GjJp/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-16FPlibQExLMt9QWJxkFCAoJUdLii2xna",
    "title": "20.詩集全集【新版】",
    "name": "20.詩集全集【新版】.apk",
    "size": 266415210,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/16FPlibQExLMt9QWJxkFCAoJUdLii2xna/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/16FPlibQExLMt9QWJxkFCAoJUdLii2xna/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-17YiTFk3o-EpJUE8VhDtE4v_q78369dgv",
    "title": "26.人生ゲーム-v6",
    "name": "26.人生ゲーム-v6.apk",
    "size": 7861316,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/17YiTFk3o-EpJUE8VhDtE4v_q78369dgv/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/17YiTFk3o-EpJUE8VhDtE4v_q78369dgv/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1OqqXBdZQbUybnf6BqwpxN5IQfu99OTE6",
    "title": "28.ロックマンコレクション_v1_2",
    "name": "28.ロックマンコレクション_v1_2.apk",
    "size": 10557065,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/1OqqXBdZQbUybnf6BqwpxN5IQfu99OTE6/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1OqqXBdZQbUybnf6BqwpxN5IQfu99OTE6/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1Pk5BBqbO70xYFwnxQ02d0_L6iVTM-nBR",
    "title": "31.SlotTen",
    "name": "31.SlotTen.apk",
    "size": 16977,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/1Pk5BBqbO70xYFwnxQ02d0_L6iVTM-nBR/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1Pk5BBqbO70xYFwnxQ02d0_L6iVTM-nBR/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1S3BzFQ0324JXu7dBY4IKvgT5i2NM-633",
    "title": "40.千客万来　落語寄席-150-500-v2.2",
    "name": "40.千客万来　落語寄席-150-500-v2.2.apk",
    "size": 525283,
    "date": "2026-10-28T07:57:21.972Z",
    "url": "https://drive.google.com/file/d/1S3BzFQ0324JXu7dBY4IKvgT5i2NM-633/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1S3BzFQ0324JXu7dBY4IKvgT5i2NM-633/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-12IqRcoSzfXBY055epNkWcbd209n-1yaU",
    "title": "19.SKHN_Music",
    "name": "19.SKHN_Music.apk",
    "size": 33301,
    "date": "2026-10-28T07:57:21.971Z",
    "url": "https://drive.google.com/file/d/12IqRcoSzfXBY055epNkWcbd209n-1yaU/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/12IqRcoSzfXBY055epNkWcbd209n-1yaU/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-11V69Pqn-1zRCcqLziC7blOpkoWLQvNiZ",
    "title": "20.詩集全集-3.1.0",
    "name": "20.詩集全集-3.1.0.apk",
    "size": 267271640,
    "date": "2026-10-28T07:57:21.971Z",
    "url": "https://drive.google.com/file/d/11V69Pqn-1zRCcqLziC7blOpkoWLQvNiZ/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/11V69Pqn-1zRCcqLziC7blOpkoWLQvNiZ/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-15cyUOI7sdeM0QasVsbaro0u97igZSiXI",
    "title": "22.ロックマンRe-v1.8",
    "name": "22.ロックマンRe-v1.8.apk",
    "size": 58278,
    "date": "2026-10-28T07:57:21.971Z",
    "url": "https://drive.google.com/file/d/15cyUOI7sdeM0QasVsbaro0u97igZSiXI/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/15cyUOI7sdeM0QasVsbaro0u97igZSiXI/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-10xWPSvBiBNOX_eUjU0-DuZ4WxypnTPgS",
    "title": "33.ザツワールド～ザツ物語",
    "name": "33.ザツワールド～ザツ物語.apk",
    "size": 564565,
    "date": "2026-10-28T07:57:21.971Z",
    "url": "https://drive.google.com/file/d/10xWPSvBiBNOX_eUjU0-DuZ4WxypnTPgS/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/10xWPSvBiBNOX_eUjU0-DuZ4WxypnTPgS/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-11LSSg524d80xOVEyYwh9aD2WgpRC_S9T",
    "title": "34.PicrossMV-v0.1.0",
    "name": "34.PicrossMV-v0.1.0.apk",
    "size": 793654,
    "date": "2026-10-28T07:57:21.971Z",
    "url": "https://drive.google.com/file/d/11LSSg524d80xOVEyYwh9aD2WgpRC_S9T/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/11LSSg524d80xOVEyYwh9aD2WgpRC_S9T/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-13t9OwAlNblJG2feaJWRBRgSz_D3gtl-E",
    "title": "39.わらい座150-v2.3",
    "name": "39.わらい座150-v2.3.apk",
    "size": 431618,
    "date": "2026-10-28T07:57:21.971Z",
    "url": "https://drive.google.com/file/d/13t9OwAlNblJG2feaJWRBRgSz_D3gtl-E/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/13t9OwAlNblJG2feaJWRBRgSz_D3gtl-E/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1-3w8-efoF6JW4VAcZTpy2pFQ5hwnJUx1",
    "title": "23.ロックマンRe2-v1.4",
    "name": "23.ロックマンRe2-v1.4.apk",
    "size": 37801,
    "date": "2026-10-28T07:57:21.970Z",
    "url": "https://drive.google.com/file/d/1-3w8-efoF6JW4VAcZTpy2pFQ5hwnJUx1/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1-3w8-efoF6JW4VAcZTpy2pFQ5hwnJUx1/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1-e5uPaGPwZPeVWaAU_kPs2S1y8MroWdk",
    "title": "25.8番入口-v1.0.0",
    "name": "25.8番入口-v1.0.0.apk",
    "size": 21037,
    "date": "2026-10-28T07:57:21.970Z",
    "url": "https://drive.google.com/file/d/1-e5uPaGPwZPeVWaAU_kPs2S1y8MroWdk/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1-e5uPaGPwZPeVWaAU_kPs2S1y8MroWdk/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-10J3t6y8WJdSu70XoXu9ZNHEgHwSGt_CB",
    "title": "37.動く城_v0.3",
    "name": "37.動く城_v0.3.apk",
    "size": 897426,
    "date": "2026-10-28T07:57:21.970Z",
    "url": "https://drive.google.com/file/d/10J3t6y8WJdSu70XoXu9ZNHEgHwSGt_CB/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/10J3t6y8WJdSu70XoXu9ZNHEgHwSGt_CB/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-15FUqoBh-RkDOShL6BOZ1XRqxKezyiCSW",
    "title": "42.咲華詩界-v0.4.0",
    "name": "42.咲華詩界-v0.4.0.apk",
    "size": 348643,
    "date": "2026-10-26T03:01:33.302Z",
    "url": "https://drive.google.com/file/d/15FUqoBh-RkDOShL6BOZ1XRqxKezyiCSW/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/15FUqoBh-RkDOShL6BOZ1XRqxKezyiCSW/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": true,
    "description": "Googleドライブの共有が制限されています。閲覧・ダウンロードにはアクセス権が必要です。"
  },
  {
    "id": "drive-13DnRaMg6IXsS7ltIsmeEn2jpt2cXsIo5",
    "title": "41.みすゞことばの小道-v0.2",
    "name": "41.みすゞことばの小道-v0.2.apk",
    "size": 254917,
    "date": "2026-10-26T03:01:24.117Z",
    "url": "https://drive.google.com/file/d/13DnRaMg6IXsS7ltIsmeEn2jpt2cXsIo5/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/13DnRaMg6IXsS7ltIsmeEn2jpt2cXsIo5/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": true,
    "description": "Googleドライブの共有が制限されています。閲覧・ダウンロードにはアクセス権が必要です。"
  },
  {
    "id": "drive-1RrMpC-hP6MwQmnCh2HZaTOplpp8gIrnI",
    "title": "40.落語-150-500-v2",
    "name": "40.落語-150-500-v2.apk",
    "size": 58203,
    "date": "2026-10-26T00:45:40.427Z",
    "url": "https://drive.google.com/file/d/1RrMpC-hP6MwQmnCh2HZaTOplpp8gIrnI/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1RrMpC-hP6MwQmnCh2HZaTOplpp8gIrnI/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": true,
    "description": "Googleドライブの共有が制限されています。閲覧・ダウンロードにはアクセス権が必要です。"
  },
  {
    "id": "drive-1pfxvBXOY0eqs1xX2Hgy86tCVRob4sB5w",
    "title": "20.詩集全集【最新版】",
    "name": "20.詩集全集【最新版】.apk",
    "size": 266157162,
    "date": "2026-10-24T03:57:32.778Z",
    "url": "https://drive.google.com/file/d/1pfxvBXOY0eqs1xX2Hgy86tCVRob4sB5w/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1pfxvBXOY0eqs1xX2Hgy86tCVRob4sB5w/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1nEJ6G5THzG_P6Zx2Lvx9ybMrbRFmtHl0",
    "title": "15.レッツゴーショッピング(最古)_v0.2.1",
    "name": "15.レッツゴーショッピング(最古)_v0.2.1.apk",
    "size": 47331862,
    "date": "2026-10-24T03:00:22.683Z",
    "url": "https://drive.google.com/file/d/1nEJ6G5THzG_P6Zx2Lvx9ybMrbRFmtHl0/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1nEJ6G5THzG_P6Zx2Lvx9ybMrbRFmtHl0/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1aBPpO-FOEJuOyGOGkRpqoI-SJNlJtzaI",
    "title": "17.なぞなぞ王_v1.1",
    "name": "17.なぞなぞ王_v1.1.apk",
    "size": 852618,
    "date": "2026-10-24T02:53:45.390Z",
    "url": "https://drive.google.com/file/d/1aBPpO-FOEJuOyGOGkRpqoI-SJNlJtzaI/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1aBPpO-FOEJuOyGOGkRpqoI-SJNlJtzaI/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1urtlEccdB8uKAlh11C8jUVelKDW1dCRA",
    "title": "16.みぃの紙粘土美術館-1.0.0",
    "name": "16.みぃの紙粘土美術館-1.0.0.apk",
    "size": 30177290,
    "date": "2026-10-24T02:53:21.004Z",
    "url": "https://drive.google.com/file/d/1urtlEccdB8uKAlh11C8jUVelKDW1dCRA/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1urtlEccdB8uKAlh11C8jUVelKDW1dCRA/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1Y5ZHk9-BNW0Gtr8OCZFnv_4tW4ep9dcu",
    "title": "15.レッツゴーショッピング_v0.7.0",
    "name": "15.レッツゴーショッピング_v0.7.0.apk",
    "size": 76715577,
    "date": "2026-10-24T02:52:47.425Z",
    "url": "https://drive.google.com/file/d/1Y5ZHk9-BNW0Gtr8OCZFnv_4tW4ep9dcu/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1Y5ZHk9-BNW0Gtr8OCZFnv_4tW4ep9dcu/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1iF9EYhv3MaxwXMIQDWG5yY5GxY9s8HRv",
    "title": "10.ことのは占い_1.0.3",
    "name": "10.ことのは占い_1.0.3.apk",
    "size": 46224,
    "date": "2026-10-24T02:51:01.436Z",
    "url": "https://drive.google.com/file/d/1iF9EYhv3MaxwXMIQDWG5yY5GxY9s8HRv/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1iF9EYhv3MaxwXMIQDWG5yY5GxY9s8HRv/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1ysGOt9spPDI9vXShFMsWV46jAuuJSPJr",
    "title": "06.クロスロード-v1.2",
    "name": "06.クロスロード-v1.2.apk",
    "size": 181148,
    "date": "2026-10-24T02:44:47.494Z",
    "url": "https://drive.google.com/file/d/1ysGOt9spPDI9vXShFMsWV46jAuuJSPJr/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1ysGOt9spPDI9vXShFMsWV46jAuuJSPJr/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1lT56Dtu9YV3O0LORf0Q4pDb74pybiuAL",
    "title": "03.新クルスク塔コレクション_v2.1.0",
    "name": "03.新クルスク塔コレクション_v2.1.0.apk",
    "size": 279722355,
    "date": "2026-10-24T02:44:03.254Z",
    "url": "https://drive.google.com/file/d/1lT56Dtu9YV3O0LORf0Q4pDb74pybiuAL/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1lT56Dtu9YV3O0LORf0Q4pDb74pybiuAL/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1U3wrqRzKkneTkRJurcWAF0XOf_cWvkkt",
    "title": "02.クルスク塔コレクション_v1.4.2",
    "name": "02.クルスク塔コレクション_v1.4.2.apk",
    "size": 208462569,
    "date": "2026-10-24T02:43:52.297Z",
    "url": "https://drive.google.com/file/d/1U3wrqRzKkneTkRJurcWAF0XOf_cWvkkt/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1U3wrqRzKkneTkRJurcWAF0XOf_cWvkkt/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  },
  {
    "id": "drive-1d2Yz3etd94ZrJ3NbW96nWnEefcQv-TaJ",
    "title": "01.遊園地パラダイス_0.2.1",
    "name": "01.遊園地パラダイス_0.2.1.apk",
    "size": 100429236,
    "date": "2026-10-24T02:43:34.106Z",
    "url": "https://drive.google.com/file/d/1d2Yz3etd94ZrJ3NbW96nWnEefcQv-TaJ/view?usp=drivesdk",
    "details": "https://drive.google.com/file/d/1d2Yz3etd94ZrJ3NbW96nWnEefcQv-TaJ/view?usp=drivesdk",
    "version": "Google Drive",
    "source": "drive",
    "restricted": false,
    "description": "Googleドライブの配布画面からAPKをダウンロードできます。"
  }
];
let games = [...DRIVE_GAMES];
$('#all-releases').href = repoURL + '/releases';
$('#upload').href = repoURL + '/releases/new';
function el(tag, cls, text) { const n = document.createElement(tag); if(cls) n.className=cls; if(text !== undefined) n.textContent=text; return n; }
function safeGitHub(url) { try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='github.com' ? u.href : null; } catch { return null; } }
function toGames(releases) {
 const items=[];
 for (const r of releases) {
  if(r.draft) continue;
  for(const a of r.assets || []) {
   if(!/\.apk$/i.test(a.name) || !safeGitHub(a.browser_download_url)) continue;
   items.push({id:a.id,title:a.label || ((r.assets || []).filter(x=>/\.apk$/i.test(x.name)).length===1 ? r.name || a.name.replace(/\.apk$/i,'') : a.name.replace(/\.apk$/i,'')),description:r.body || '',name:a.name,size:Number(a.size)||0,date:r.published_at || a.updated_at,url:safeGitHub(a.browser_download_url),details:safeGitHub(r.html_url),version:r.tag_name || '',prerelease:r.prerelease});
  }
 }
 return items;
}
function render() {
 const q=$('#search').value.trim().toLocaleLowerCase('ja');
 const list=games.filter(g=>[g.title,g.name,g.description].some(t=>t.toLocaleLowerCase('ja').includes(q)));
 list.sort($('#sort').value==='name' ? (a,b)=>a.title.localeCompare(b.title,'ja') : $('#sort').value==='size' ? (a,b)=>a.size-b.size : (a,b)=>new Date(b.date)-new Date(a.date));
 $('#count').textContent=`${list.length} / ${games.length} 本`;
 $('#cards').replaceChildren();
 if(games.length) $('#status').textContent=list.length ? '' : 'このキーワードのゲームは見つかりませんでした。';
 for (const g of list) {
  const card=el('article','card'); const cover=el('div','cover','♧'); cover.setAttribute('aria-hidden','true');
  const body=el('div','card-body'); body.append(el('span','tag',g.source==='drive' ? (g.restricted?'ANDROID / アクセス権が必要':'ANDROID / GOOGLE DRIVE') : g.prerelease?'ANDROID / 試作版':'ANDROID / APK'),el('h3','',g.title));
  body.append(el('p','',g.description.slice(0,160) || 'ゲームの詳細は配布ページをご覧ください。'));
  const date=new Date(g.date); body.append(el('div','meta',`${g.version} · ${(g.size/1048576).toFixed(1)} MiB${Number.isNaN(date.getTime())?'':` · ${date.toLocaleDateString('ja-JP')}`}`));
  const download=el('a','download',g.source==='drive'?'GoogleドライブでAPKを開く ↗':'↓ APKをダウンロード'); download.href=g.url; download.target='_blank'; download.rel='noopener';
  download.setAttribute('aria-label',`${g.title}${g.source==='drive'?'のGoogleドライブ配布画面を開く':'のAPKをダウンロード'}`); body.append(download,el('p','filename',g.name));
  if(g.details) { const detail=el('a','detail',g.source==='drive'?'Googleドライブの配布元 ↗':'ゲーム詳細・更新内容 ↗'); detail.href=g.details;detail.target='_blank';detail.rel='noopener';body.append(detail); }
  card.append(cover,body); $('#cards').append(card);
 }
}
async function load() {
 $('#retry').hidden=true; games=[...DRIVE_GAMES]; render(); $('#status').textContent='GoogleドライブのAPKを表示しています。追加の配布情報を確認中…';
 let releases=[]; let partial=false;
 try {
  for(let page=1;page<=20;page++) {
   const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
   if(!response.ok) throw new Error(response.status===404 ? '配布先がまだ準備中です。公開リポジトリを作り、ReleasesにAPKを追加してください。' : [403,429].includes(response.status) ? '一覧の取得が一時的に制限されています。少し時間をおくか、GitHubの配布一覧をご利用ください。' : 'ゲーム一覧を取得できませんでした。通信状態をご確認ください。');
   const data=await response.json(); if(!Array.isArray(data)) throw new Error('配布データを読み込めませんでした。');
   releases.push(...data); if(data.length<100) break; if(page===20) partial=true;
  }
  games=[...DRIVE_GAMES,...toGames(releases)]; render();
  $('#status').textContent=games.length ? (partial?'直近2,000リリース分を表示しています。すべての配布はGitHubの一覧をご覧ください。':'') : 'ゲームの森は、ただいま開園準備中です。\nAPKが公開されると、ここにダウンロードボタンが並びます。';
 } catch(error) {
  if(releases.length) { games=[...DRIVE_GAMES,...toGames(releases)]; render(); }
  $('#status').textContent=(games.length?'GoogleドライブのAPKは表示済みです。追加の配布情報を取得できませんでした。\n':'') + (error.name==='TimeoutError'?'読み込みに時間がかかっています。もう一度お試しください。':error instanceof TypeError?'通信できませんでした。ネット接続をご確認いただくか、GitHubの配布一覧をご利用ください。':error.message);
  $('#retry').hidden=false;
 }
}
$('#search').addEventListener('input',render); $('#sort').addEventListener('change',render); $('#retry').addEventListener('click',load); load();
