/**
 * Gemini API 서비스 (REST API v1 직접 호출)
 * - Google Gemini 2.0 Flash 모델 사용 (Thinking 토큰 문제 해결)
 * - 학생이 작성한 도와준 내용을 생활기록부 형식으로 변환
 */

// 로컬 개발 환경 체크
const isLocalDev = import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent'

/**
 * 도와준 내용을 생활기록부 형식으로 변환
 * @param {string} helpDescription - 학생이 작성한 원본 도와준 내용
 * @returns {Promise<string>} AI가 변환한 생활기록부 형식 내용
 * 
 * @example
 * const original = "25+8 계산이 어려웠는데 5더하기8은 13이고 10은 받아올림되서 20+10이 된다는 것을 알려줬어요"
 * const converted = await convertToRecordFormat(original)
 * // "두자릿수 더하기 한자릿수 계산을 어려워하는 친구를 위해 받아올림의 계산 원리를 친절히 설명함"
 */
export const convertToRecordFormat = async (helpDescription) => {
  if (!helpDescription || helpDescription.trim().length === 0) {
    throw new Error('변환할 내용이 없습니다.')
  }

  try {
    // 로컬 개발 환경: 직접 API 호출
    if (isLocalDev) {
      const prompt = `다음은 초등학생이 친구를 도와준 내용입니다. 이것을 초등학교 생활기록부에 기록할 한 문장으로 변환하세요.

규칙:
- 반드시 한 문장으로만 작성
- 50자 이내로 간결하게
- "~함", "~하였음" 등 서술형 종결어미 사용
- 설명이나 부연 없이 변환된 문장만 출력
- 학생의 긍정적인 행동 강조

원본: ${helpDescription}

변환:`

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 10000
        }
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text.trim()
        }
      }

      throw new Error('AI 변환 결과가 비어있습니다.')
    }

    // 프로덕션 환경: Cloudflare Functions 사용
    const response = await fetch('/api/gemini-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'help',
        helpDescription
      })
    })

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`)
    }

    const data = await response.json()
    return data.convertedText

  } catch (error) {
    console.error('❌ 도와준 내용 변환 실패:', error.message)
    throw error
  }
}

/**
 * API 키 유효성 검사
 * @returns {boolean} API 키 존재 여부
 */
export const isGeminiApiKeyConfigured = () => {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0
}

/**
 * 배움기록을 생활기록부 형식으로 변환
 * @param {string} studentName - 학생 이름
 * @param {string} coreLearning - 핵심배움 내용
 * @param {Array<string>} learningProcess - 학습과정 체크리스트
 * @returns {Promise<string>} AI가 변환한 생활기록부 형식 내용
 */
export const generateSchoolRecord = async (studentName, coreLearning, learningProcess) => {
  if (!coreLearning || coreLearning.trim().length === 0) {
    throw new Error('핵심배움 내용이 없습니다.')
  }

  try {
    const processText = learningProcess && learningProcess.length > 0
      ? learningProcess.join(', ')
      : '없음'

    // 로컬 개발 환경: 직접 API 호출
    if (isLocalDev) {
      const prompt = `다음은 초등학생의 배움기록입니다. 이를 생활기록부 형식으로 변환하세요.

핵심배움: ${coreLearning}
학습태도: ${processText}

규칙:
1. 주어 없이 서술 (예: "친구를 도와주며~", "적극적으로~")
2. 2-3문장으로 간결하게
3. "~하였음", "~보였음" 등 과거형 종결
4. 학습 내용과 태도를 자연스럽게 연결
5. 변환된 문장만 출력 (설명 금지)

예시:
"분수의 덧셈에서 분모를 통분하는 방법을 이해하였으며, 친구를 도와주고 적극적으로 질문하는 등 협력적 학습 태도를 보였음."

변환:`

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 10000
        }
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text.trim()
        }
      }

      throw new Error('AI 변환 결과가 비어있습니다.')
    }

    // 프로덕션 환경: Cloudflare Functions 사용
    const response = await fetch('/api/gemini-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'learning',
        studentName,
        coreLearning,
        learningProcess
      })
    })

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`)
    }

    const data = await response.json()
    return data.convertedText

  } catch (error) {
    console.error('❌ 배움기록 변환 실패:', error.message)
    throw error
  }
}
