/**
 * @careermate/prompts — install.ts
 *
 * Copy-paste install prompts the user pastes into their AI assistant to set up
 * the CareerMate MCP connection, verify it, and begin onboarding.
 *
 * Three variants tuned to each assistant. All Korean-first.
 */

export const INSTALL_PROMPT_CLAUDE = `Claude야, 아래 CareerMate 설치 페이지(또는 INSTALL.md)를 읽고 내 컴퓨터에 CareerMate를 설치하고 설정해줘.

순서는 이렇게 진행해줘.
1. 설치 안내 페이지 / INSTALL.md 내용을 끝까지 읽고 그대로 따라 해.
2. CareerMate MCP 서버를 내 Claude에 연결(설정)해줘.
3. 연결이 끝나면 \`get_onboarding_status\`를 호출해서 정말로 연결되었는지 확인하고, 결과를 쉬운 말로 알려줘.
4. 그다음 나에게 이력서나 자기소개서 파일을 업로드하라고 안내해줘.
5. 내가 올린 파일을 바탕으로 내 프로필을 구조화해서 \`save_profile\`로 CareerMate에 저장하고, 온보딩을 시작해줘.

기술 용어는 최대한 빼고, 매 단계마다 지금 뭘 하고 있는지 내가 쓰는 언어로 쉽게 알려줘. 막히는 부분이 있으면 추측하지 말고 나에게 물어봐줘.`;

export const INSTALL_PROMPT_CHATGPT = `ChatGPT야, 아래 페이지를 읽고 내 컴퓨터에 CareerMate를 설치하고 설정해줘. 설치가 끝나면 연결 상태를 확인하고, 나에게 이력서나 자기소개서 파일을 업로드하라고 안내해줘. 그다음 내 프로필을 구조화해서 CareerMate에 저장해줘.

구체적으로는 이렇게 해줘.
1. CareerMate 설치 안내 페이지 / INSTALL.md를 읽고 그대로 따라 설치해.
2. CareerMate MCP 커넥터를 연결(설정)해줘.
3. 연결 후 \`get_onboarding_status\`를 호출해 연결이 정상인지 확인하고 결과를 쉬운 말로 알려줘.
4. 이력서·자기소개서 파일을 업로드하라고 나에게 안내해줘.
5. 올린 파일로 내 프로필을 정리해서 \`save_profile\`로 저장하고 온보딩을 시작해줘.

진행 상황은 항상 내가 쓰는 언어로 쉽게 설명하고, 확실하지 않은 정보는 지어내지 말고 나에게 물어봐줘.`;

export const INSTALL_PROMPT_GENERIC = `안녕, 아래 CareerMate 설치 안내(설치 페이지 또는 INSTALL.md)를 읽고 내 컴퓨터에 CareerMate를 설치하고 설정해줘.

CareerMate는 내 커리어 데이터(프로필·이력서·자기소개서·지원 현황)를 내 컴퓨터에 저장하고, MCP를 통해 너(내 AI)가 그 데이터를 읽고 쓸 수 있게 해주는 도구야. 분석과 작성은 전부 네가 해.

이렇게 진행해줘.
1. 설치 안내 문서를 끝까지 읽고 그대로 따라 설치해.
2. 네가 쓰는 AI 도구에 CareerMate MCP 서버를 연결(설정)해줘.
3. 연결 후 \`get_onboarding_status\`를 호출해 연결 상태를 확인하고, 결과를 내가 쓰는 언어로 쉽게 알려줘.
4. 나에게 이력서나 자기소개서 파일을 업로드하라고 안내해줘.
5. 올린 파일로 내 프로필을 구조화해서 \`save_profile\`로 저장하고 온보딩을 시작해줘.

매 단계마다 내가 쓰는 언어로 쉽게 설명하고, 불확실한 내용은 지어내지 말고 나에게 확인해줘.`;
