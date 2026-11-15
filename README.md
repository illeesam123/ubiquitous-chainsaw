# 참호전 (Trench War) — 데스크톱 패키지

아이소메트릭 참호전 RTS. 기존 단일 HTML(V16)을 모듈로 분리하고 Electron으로 감쌌습니다.

## 실행
```bash
npm install          # electron, electron-builder, playwright
npm start            # 빌드 후 데스크톱 창으로 실행
npm test             # 빌드 + 헤드리스 스모크 테스트
npm run dist         # 설치 파일 생성 (Windows NSIS / macOS dmg / Linux AppImage)
```
브라우저만으로 실행하려면 `npm run build` 후 `dist/index.html`을 열면 됩니다.

## 구조
- `src/NN_이름.js` — 기능별 모듈 (42개). 실행 순서는 `src/MANIFEST.json`이 정합니다.
  - 데이터/생성: constants, util, map-gen, biomes, nature-buildings, special-seeds
  - 시뮬레이션: pathfinding, tasks, units-world, combat, vehicles, medical, demolition, roads, armory-explosives
  - AI: ai-base, ai-brain, trench-ext
  - 렌더링: render, draw-*, fx, weather, minimap, overlay
  - UI/입력/사운드: ui-state, input, shop-ui, hud, music, sfx
- `assets/music/*.mp3` — BGM (이전엔 base64로 HTML에 내장, 6MB → 230KB 코드 + 외부 파일)
- `tools/build.js` — 모듈을 순서대로 합쳐 `dist/game.js` 생성
- `electron/main.js` — 데스크톱 창 (F11 전체화면, F12 개발자도구)
- `tests/smoke.js` — 게임 시작·시뮬레이션 오류 점검

## 새 기능 추가
1. `src/`에 `NN_기능.js`를 만들고 `MANIFEST.json`에 추가
2. 기존 함수를 확장할 땐 `const _old=fn; fn=function(...){...}` 래퍼 패턴을 쓰고 있음 (도로·무기고 모듈 참고)

## 알려진 한계 / 다음 단계
- 모듈은 전역 스코프를 공유하는 스크립트입니다(ES 모듈 아님). 파일 간 의존이 많아 import/export 전환은 단계적으로 진행해야 합니다.
- 밀집 도시 맵에서는 건물 그리기가 프레임 시간의 절반 이상을 차지합니다 → 건물 스프라이트 캐시(오프스크린)가 다음 최적화 대상입니다.
- 시뮬레이션의 웹워커 분리는 렌더러와 상태를 공유하는 구조 때문에 아직 하지 않았습니다.
