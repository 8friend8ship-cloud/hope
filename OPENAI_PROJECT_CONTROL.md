# OpenAI Project Control

- Repository: `8friend8ship-cloud/hope`
- Actual package: `hope-purchase-platform-v4.0`
- Project role: **희망구매·구매결정 지원 및 PDF 결과 생성 앱**
- Management status: `FEATURE_AUDIT_REQUIRED`
- Last reviewed: `2026-07-30 KST`

## 1. 활용 방향

이 저장소는 사용자의 구매 희망·조건·비교 결과를 정리하고 AI 분석 결과를 다국어/PDF 형태로 제공하는 앱으로 관리한다. 상세 상품·결제·제휴 기능은 실제 컴포넌트 검토 후 확정한다.

## 2. 상호 연계

- 시장/수요 분석: `Analyzer-12.09`
- 설명문·가이드 생성: `DRYWRITE`
- 콘텐츠/클립 전환: `-`, `animation`
- 상품·제휴·구매 데이터: 중앙 Agent/외부연결 운영대장
- PDF 및 결과 파일: Drive `HOPE_OUTPUT`

## 3. Drive 연계 정책

- `MASTER_REGISTRY`
- `HOPE_INPUT`
- `HOPE_OUTPUT`
- `PRODUCT_OFFER_REGISTRY`
- `CUSTOMER_REQUEST_QUEUE`
- `CONTENT_FACTORY`

개인 구매정보, 결제정보, 제휴 Secret, API 키는 공개 저장소에 넣지 않는다.

## 4. 파일 꼬리표

- `[PURCHASE]`: 구매 조건·비교·희망 요청
- `[PDF]`: PDF 생성·페이지 처리
- `[I18N]`: 다국어 템플릿
- `[AI]`: Gemini 분석
- `[FRONTEND]`: 입력·결과 화면
- `[DRIVE]`: 요청·결과 저장
- `[AFFILIATE]`: 제휴 상품 연결
- `[PRIVACY]`: 사용자 정보
- `[SECRET]`: 키·결제/제휴 설정
- `[REVIEW]`: 상세 기능 확인 필요

## 5. 초기 파일 대장

| 파일/영역 | 태그 | 활용 방향 | 상태 | 다음 점검 |
|---|---|---|---|---|
| `package.json` | `[PDF] [AI] [DEPLOY]` | jsPDF·html2canvas·Gemini 환경 | 확인됨 | 빌드 및 PDF 한글 폰트/페이지 확인 |
| 다국어 템플릿 | `[I18N]` | 언어별 구매 결과 | 일부 확인 | 지원 언어·번역 원본 관리 확인 |
| PDF 생성 | `[PDF]` | 결과 리포트 다운로드 | 일부 확인 | 페이지 잘림·개인정보·파일명 점검 |
| 구매 입력/결과 | `[PURCHASE] [FRONTEND]` | 조건 수집과 비교 결과 | 검토 예정 | 실제 데이터 구조와 저장 위치 확인 |
| Gemini 호출 | `[AI] [SECRET]` | 추천·설명·비교 | 우선 검토 | 근거/광고 표시/키 노출 점검 |
| 제휴·상품 연결 | `[AFFILIATE] [REVIEW]` | 수익화 후보 | 검토 예정 | 쿠팡/Amazon/AliExpress 연결 여부 확인 |

## 6. 수정 진행 규칙

1. 추천과 광고·제휴 결과를 구분한다.
2. 상품 가격·재고·정책은 고정값으로 단정하지 않는다.
3. PDF에는 개인정보와 내부 키가 포함되지 않도록 한다.
4. 실제 상품/제휴 연결은 중앙 운영대장 등록 후 진행한다.
5. 코드 변경은 작업 브랜치와 Draft PR로 진행한다.
6. 기능 검토 후 앱의 정확한 고객·수익 모델을 이 문서에 확정한다.

## 7. 결정 기록

- `2026-07-30`: 패키지와 PDF/다국어 기능을 기준으로 희망구매 플랫폼으로 분류하고 상세 기능 감사 대상으로 지정함.
