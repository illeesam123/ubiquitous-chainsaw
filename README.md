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

## 벡터(SVG) 스프라이트 (파일 기반)
- 건물·장애물은 `assets/sprites/*.svg` 를 **게임이 직접 읽어** 그립니다. 목록은 `assets/sprites/manifest.js`.
  SVG 파일을 고치면(색, 모양 등) 게임 그림이 그대로 바뀝니다. `assets/sprites/index.html` 을 열면 전체 갤러리를 볼 수 있습니다.
- **기본 디자인은 plain** 하나입니다. 바이옴별 디자인이 있는 건 나무(`tree_swamp_…`, `tree_snow_…`, `tree_arid_…`)뿐이고,
  바이옴 전용 파일이 없으면 자동으로 plain 파일을 씁니다. 새 바이옴 전용 디자인을 만들려면 `src/42_svg-sprites.js`의 `SPR_BIOME`에 종류를 추가하세요.
- 파일 이름 규칙: `종류_바이옴_크기_변형_id_파손단계_이웃_소유_출처_재고.svg`
- 파일에 없는 조합이 생기면 게임이 실행 중에 절차적 그리기 코드로 임시 생성(폴백)합니다.
- `npm run sprites` 는 절차적 그리기 코드에서 SVG를 **다시 생성**해 덮어씁니다(손으로 고친 파일은 사라짐 — 고친 파일은 커밋하고 이 명령은 새 종류를 추가할 때만 쓰세요).
- 병사가 들어 있거나 피격 점멸/박격포 발사 중인 건물은 기존 절차적 그리기로 그립니다. 체력바와 무기고 재고 글자는 위에 덧그립니다.
- 알려진 차이: 나무·의무막사 깃발 흔들림 애니메이션은 정지 상태입니다.
- 최적화가 이루어지지 않았습니다. 중복 적용해야 하는 모양이 많으며, 추후 변경 예정입니다.

## 게임플레이 모듈 메모
- `43_endgame.js`: 최종 페이즈(pit 브금·적 방향 화살표+비프), 기지 몰락(회색 처리·헬기 중단)
- `44_panic-civilians.js`: 패닉(저체력+의료막사 없음/악천후 → 투항·자결), 민간인(마을 주변 배회, 발각 시 근접전·무장 전투·투항·도주)
- `18_ai-brain.js`: AI 성향(aggressive/defensive/tricky/balanced)과 전술(정면·돌격·우회·덤불 매복)

## 새 기능 추가
1. `src/`에 `NN_기능.js`를 만들고 `MANIFEST.json`에 추가
2. 기존 함수를 확장할 땐 `const _old=fn; fn=function(...){...}` 래퍼 패턴을 쓰고 있음 (도로·무기고 모듈 참고)

## 알려진 한계 / 다음 단계
- 모듈은 전역 스코프를 공유하는 스크립트입니다(ES 모듈 아님). 파일 간 의존이 많아 import/export 전환은 단계적으로 진행해야 합니다.
- 밀집 도시 맵에서는 건물 그리기가 프레임 시간의 절반 이상을 차지합니다 → 건물 스프라이트 캐시(오프스크린)가 다음 최적화 대상입니다.
- 시뮬레이션의 웹워커 분리는 렌더러와 상태를 공유하는 구조 때문에 아직 하지 않았습니다.

## 비주얼 FX (`src/45_visual-fx.js`)
시간대 색조(새벽·정오·황금빛·황혼, 240초 주기), 태양 렌즈 플레어(맑은 낮에만), 세로 그라데이션·비네트, 폭발/포구/화염 블룸을 `drawWeatherOverlay` 뒤에 얹습니다. 헤더 ✨ 버튼으로 끄고 켤 수 있으며 설정은 localStorage(`trench.fx`)에 저장됩니다.

## 에셋(SVG)과 에셋 매니저
- `assets/sprites/*.svg` : 건물·장애물에 더해 **병사(팀×자세×방향), 차량(전차·트럭 ×팀×16방향), 타일(바이옴×종류×음영×무늬), 도로·철로(연결 모양×무늬), 구덩이**가 모두 SVG 파일입니다. 게임은 이 파일을 직접 읽고(`manifest.js` 가 목록), 파일이 없거나 로딩 중이면 기존 절차적 그리기로 폴백합니다.
- 모든 SVG 맨 앞에는 그림 영역 전체에 딱 맞는 **투명 경계 사각형**(`<rect id="bounds" fill-opacity="0">`)이 들어 있어 편집기·미리보기에서 영역이 일정하게 보입니다.
- `npm run sprites` : 게임 그리기 코드에서 SVG·`manifest.js`·`catalog.json` 을 다시 생성합니다 (손으로 고친 파일은 덮어쓰이므로 주의).
- `npm run editor` : 에셋 매니저(http://localhost:5173/editor/) 실행. 우측 상단 핫바에서 에셋 이름을 검색/클릭 → 바이옴·상태·무늬별 표 → 모양 클릭 → **다운로드 / 업로드(교체) / 비교 / 디스크 저장**. 업로드한 그림은 그 에셋 영역에 맞게 자동 보정됩니다(SVG·PNG·JPG·WebP).
- 같은 주소(`/dist/index.html`)의 게임 탭에는 교체본이 **즉시** 반영됩니다(BroadcastChannel + localStorage).
- **GitHub 연동**: 에디터의 GitHub 패널에 저장소·브랜치·토큰(Contents 쓰기 권한)을 넣으면 변경분을 한 커밋으로 푸시합니다. 게임 헤더의 ☁ 버튼(또는 에디터의 "게임이 GitHub 에셋을 읽게 하기")을 켜면 최신 커밋의 SVG 를 raw 주소에서 직접 읽어 재빌드 없이 적용합니다.
- 한계: 참호 타일, 갈대, 수면 물결, 민간인, 헬기 등은 아직 코드로 그립니다. 전차는 포탑이 차체와 정렬됐을 때만 스프라이트(조준·발사 중엔 코드 폴백), 피격 점멸·폭탄 작업 중 병사도 코드 폴백입니다.
- **서버 없이 쓰기**: `npm run editor:html` 이 `dist/asset-manager.html`(카탈로그·SVG 내장 단일 파일)을 만듭니다. GitHub Actions 의 **asset-manager** 산출물로도 내려받을 수 있고, 더블클릭으로 열면 됩니다. (디스크 저장만 제외하고 동일하게 동작)

### 에셋 절감 구조 (v2)
- **병사 몸/팀색 분리**: 몸(다리·머리·헬멧)은 중립 파일, 상의는 *팀색 마스크*(`ubodyt`)로 분리 → 팀·방향마다 만들지 않고 7자세 × 2파일만 사용.
- **총·삽 분리**: `gun_<총기>_side/up/down`, `tool_shovel_side/up/down` 3모양만 두고 각도 보간(트위닝)·좌우반전·레이어 순서(위쪽을 겨누면 몸 뒤)로 사용. 병사에게 `u.gun`(총기칸, 기본 `rifle`)이 있고 `GUNS` 표에 항목을 추가하면 새 총기를 만들 수 있습니다.
- **좌우반전 재사용**: 차량 방향(q↔4−q), 도로 연결(E↔S, W↔N), 타일 무늬(2파일+반전=4종), 나무·바위·상자·잔해의 무늬 3·4번, 울타리/철조망/모래주머니 연결 모양.
- **점령 건물**: 병사가 든 집·헛간·창고·폐허·아파트는 건물 스프라이트 위에 자리별 `occ`(중립) + `occt`(팀색) 오버레이를 얹습니다. 사격 중(총구 화염·피격 점멸)에는 코드 그리기로 폴백.
- **색상 치환형**(`ubodyt`, `occt`, `flagc`)은 에디터에서 따로 분류되며, 마스크의 **회색 명암은 그대로 두고 색상·채도만** 팀 색으로 바뀝니다(`color` 블렌드). 새 마스크는 흰색이 아니라 *중간 회색* 기준으로 명암을 그리세요. 깃발은 기둥 1개 + 천 1장이며 펄럭임은 게임에서 천을 기울임(skew)해 만듭니다.
- **다리**(`bridge`): 육지/물 위 2종. 방향 구분 없이 하나를 사용합니다.
- **에디터 🧩 조합 미리보기**: 병사(몸통+팀색+총기/삽, 조준 각도·앞뒤 레이어), 점령된 건물(건물+점령자), 깃발(기둥+기울인 천)을 게임과 같은 방식으로 합쳐 보여줍니다.
- 에디터의 **ZIP** 버튼: 에셋 종류별로 SVG 전체 + `index.json` + 스프라이트 시트(`sheet.png`/`sheet.json`)를 받습니다. 헤더의 "전체 ZIP"은 모든 SVG(시트 제외).
