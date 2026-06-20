# Third-Party Notices

CareerMate에 포함된 일부 콘텐츠는 제3자 오픈소스에서 파생되었습니다. 해당 라이선스 고지를 아래에 보존합니다.

---

## im-not-ai (한국어 "AI 티 안 나는 글쓰기" 분류)

- 출처: `epoko77-ai/im-not-ai` ("AI가 쓴 글이 아닌 것처럼 윤문해주는 스킬")
- 라이선스: MIT
- 사용 범위: `packages/prompts/src/humanize.ts`의 `HUMANIZE_WRITING_GUIDE`는 위 프로젝트의
  한국어 AI-tell 분류(번역투·기계적 병렬·클리셰·상투적 연결어·균일한 문장 리듬 등)를
  자기소개서·커리어 글쓰기용으로 압축·각색한 파생 저작물입니다. 원문을 그대로 복제하지 않았습니다.

원본 라이선스(MIT) 전문:

```
MIT License

Copyright (c) 2026 epoko77-ai

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 번들에 포함되는 npm 의존성 (런타임)

배포 시 `dist/` 번들(esbuild)에 코드가 인라인되는 런타임 의존성입니다. MCP 서버·프로토콜(`@modelcontextprotocol/sdk`)과 입력 스키마 검증(`zod`), 그리고 `read_document`의 문서 텍스트 추출(순수 JS)에 사용합니다. 각 라이선스 고지를 보존하며, 각 라이선스 전문은 설치된 `node_modules/<패키지>/LICENSE` 에 포함됩니다.

| 패키지 | 용도 | 라이선스 | 저작권 |
| --- | --- | --- | --- |
| [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | MCP 서버·프로토콜 | MIT | Copyright (c) Anthropic, PBC |
| [`zod`](https://github.com/colinhacks/zod) | 입력 스키마 검증 | MIT | Copyright (c) Colin McDonnell |
| [`mammoth`](https://github.com/mwilliamson/mammoth.js) | `.docx` → 텍스트 | BSD-2-Clause | Copyright (c) Michael Williamson |
| [`hwp.js`](https://github.com/hahnlee/hwp.js) | `.hwp`(HWP 5.x) → 텍스트 | Apache-2.0 | Copyright Han Lee and other contributors |
| [`fflate`](https://github.com/101arrowz/fflate) | `.hwpx` 압축 해제 | MIT | Copyright (c) 2023 Arjun Barrett |
| [`pdfjs-dist`](https://github.com/mozilla/pdf.js) | `.pdf` → 텍스트 | Apache-2.0 | Copyright Mozilla Foundation and contributors |

> Apache-2.0(`hwp.js`, `pdfjs-dist`)은 라이선스 사본과 NOTICE 고지 보존을 요구합니다. 위 표와 `node_modules`의 동봉 라이선스로 이를 충족합니다.
