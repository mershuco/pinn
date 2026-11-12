# 독자의 가설 · 전독시 IF

한 사건의 결과를 바꾸면 이후 이야기가 어떻게 달라질지 추론하고 짧은 가상 결말을 작성하는 웹사이트입니다. **Vercel + 서버 API**로 운영합니다. AI 키는 서버 환경 변수에서만 읽고, 브라우저에 전달하지 않습니다. 기존 게임은 별개로 유지합니다.

[Vercel에 배포하기](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmershuco%2Fpinn%2Ftree%2Forv-if-site&project-name=orv-if-pinn&repository-name=orv-if-site&env=OPENAI_API_KEY&envLink=https%3A%2F%2Fplatform.openai.com%2Fapi-keys)

## Vercel 연결

1. 위 링크에서 Vercel에 로그인하고 GitHub를 연결합니다.
2. 배포 화면의 `OPENAI_API_KEY` 항목에 운영용 키를 입력합니다. 채팅이나 GitHub 파일에는 넣지 않습니다. OpenAI 계정에 API 사용 가능 잔액·한도가 필요합니다.
3. **Deploy**를 누르면 화면과 `/api/predict` 서버가 같은 주소에 배포됩니다.
4. 생성된 주소에서 실제 질문을 제출해 AI 응답을 확인합니다. `/api/health`의 `ready`는 키 등록 상태이며, 실제 호출 성공을 보증하지 않습니다.

기본 모델은 `gpt-4.1-mini`이고 Vercel 환경 변수 `OPENAI_MODEL`로 변경할 수 있습니다. OpenAI Responses API를 호출하며 질문과 사건 요약을 보냅니다. `store:false`를 지정하고, 서버 로그에 질문이나 키를 직접 기록하지 않습니다. API 사용 요금은 연결한 OpenAI 계정의 설정을 따릅니다. 방문자가 AI 서비스에 로그인할 필요는 없습니다.

이미 연결한 Vercel 프로젝트를 이 환경에서 배포하려면 비밀 변수 `ORV_VERCEL_TOKEN`을 `api.vercel.com` 대상으로 등록하고, 일반 변수 `ORV_VERCEL_PROJECT_ID`를 지정합니다. 팀 프로젝트는 `ORV_VERCEL_TEAM_ID`도 지정합니다. 운영용 AI 키는 **Vercel 프로젝트의 Production 환경 변수**에 직접 저장합니다. 이 환경의 비밀값 프록시를 원격 서버로 복사하지 않습니다.

```sh
npm run deploy
```

## 실행과 검증

Node 24, Python 3.12. 추가 패키지 설치 없이 실행합니다.

```sh
npm run dev
# http://localhost:4180
npm test
npm run test:browser  # 위 dev 서버를 실행한 상태에서
npm run build:vercel
npm run build:pages
```

로컬 서버도 Vercel과 같은 Node API를 사용합니다. 서버에 `OPENAI_API_KEY`가 없으면 실제 예측은 503 연결 대기 오류를 반환합니다. 예시를 실제 AI 결과처럼 대신 반환하지 않습니다. 단위·브라우저 테스트의 모델 응답은 모의 응답이며 실제 API 호출과 구분합니다.

GitHub Pages의 `/pinn/if/`는 화면·예시 미리보기입니다. `build:pages`는 미리보기 설정을 별도 `build-pages/`에 생성하고 AI가 연결되지 않았음을 표시합니다. 운영용 Vercel 배포는 `public/`의 서버 설정을 사용합니다. 배포 브랜치 `orv-if-site`는 앱만 포함하는 독립 소스입니다.

## 동작과 한계

기존 사건, 사용자 변화, 추가 가정, 인과 변화 3~5개, IF 결말, 불확실성을 구분합니다. 질문은 8~600자이며, 응답 형식이 잘못되거나 서비스가 실패하면 오류와 재시도를 제공합니다. 결과는 이 브라우저에 최근 10개만 저장하고 지울 수 있습니다. 요청 제한은 Vercel 함수 인스턴스별 IP 기준 분당 5회로, 전역 사용량·지출 상한은 아닙니다. 브라우저에서 취소해도 이미 시작된 서버 추론을 취소한다고 보장하지 않습니다.

[사건 요약](server/knowledge.mjs)과 [기존 조사 참고서](references/story-reference.md), [선택 웹툰 장면 대조 기록](references/webtoon-comparison.md)을 사용합니다. 범위는 프롤로그~마계의 봄이고 외전·영화는 제외합니다. 소설 원문 전수 검증이나 전체 소설 학습 완료를 주장하지 않습니다. 원문·패널·OCR 전문을 배포하지 않습니다. 자료 번호는 원작 회차가 아니며, 범위 이후의 결말은 창작 IF입니다. 프롬프트는 능력·계약의 근거 없는 이전을 제한하지만 AI의 사실성과 추론을 보증하지는 않습니다.

이전 Cloudflare 실험 코드는 `npm run deploy:cloudflare`에 남아 있지만 기본 배포는 Vercel입니다.
