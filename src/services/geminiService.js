/**
 * Gemini API 서비스 (REST API v1 직접 호출)
 * - Google Gemini 2.0 Flash 모델 사용 (Thinking 토큰 문제 해결)
 * - 학생이 작성한 도와준 내용을 생활기록부 형식으로 변환
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent'

// 디버깅: 환경 변수 로드 확인
console.log('🔍 [환경변수 체크]')
console.log('- import.meta.env:', import.meta.env)
console.log('- VITE_GEMINI_API_KEY 존재:', !!GEMINI_API_KEY)
if (GEMINI_API_KEY) {
  console.log('- API 키 앞 20자:', GEMINI_API_KEY.substring(0, 20) + '...')
}

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
  console.log('🔍 [1단계] 함수 시작')
  console.log('📝 입력 내용:', helpDescription)
  
  if (!GEMINI_API_KEY) {
    console.error('❌ [1단계 실패] API 키가 없습니다')
    throw new Error('Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가해주세요.')
  }
  console.log('✅ [1단계 통과] API 키 존재 확인:', GEMINI_API_KEY.substring(0, 20) + '...')
  
  if (!helpDescription || helpDescription.trim().length === 0) {
    throw new Error('변환할 내용이 없습니다.')
  }
  console.log('✅ [2단계 통과] 입력 내용 유효성 확인')

  try {
    // 프롬프트 생성 (구체적인 지시사항)
    const prompt = `다음은 초등학생이 친구를 도와준 내용입니다. 이것을 초등학교 생활기록부에 기록할 한 문장으로 변환하세요.

규칙:
- 반드시 한 문장으로만 작성
- 50자 이내로 간결하게
- "~함", "~하였음" 등 서술형 종결어미 사용
- 설명이나 부연 없이 변환된 문장만 출력
- 학생의 긍정적인 행동 강조

원본: ${helpDescription}

변환:`

    console.log('✅ [3단계 통과] 프롬프트 생성 완료')
    console.log('🌐 [4단계] REST API v1 호출 시작')
    console.log('📍 URL:', GEMINI_API_URL)
    console.log('🤖 모델: gemini-2.0-flash (Thinking 없음, 빠른 응답)')
    console.log('💡 전략: 효율적인 토큰 사용')

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 10000
      }
    }
    console.log('📦 요청 본문 생성 완료')

    // REST API v1 직접 호출
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📡 [4단계] 응답 받음 - 상태 코드:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ [4단계 실패] API 오류:', JSON.stringify(errorData, null, 2))
      throw new Error(`Gemini API 호출 실패: ${response.status}`)
    }

    console.log('✅ [4단계 통과] API 호출 성공')

    const data = await response.json()
    console.log('📥 [5단계] 응답 데이터:', JSON.stringify(data, null, 2))
    
    // 응답에서 텍스트 추출 (Gemini 2.5 구조)
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      
      // content.parts 확인
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const convertedText = candidate.content.parts[0].text.trim()
        console.log('✅ [5단계 통과] 텍스트 추출 성공:', convertedText)
        return convertedText
      }
      
      console.error('❌ [5단계 실패] content.parts가 비어있음')
      console.error('finishReason:', candidate.finishReason)
      console.error('usageMetadata:', data.usageMetadata)
    }

    throw new Error('AI 변환 결과가 비어있습니다.')
  } catch (error) {
    console.error('❌❌❌ 최종 실패:', error.message)
    console.error('전체 에러 객체:', error)
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
  console.log('🔍 [배움기록 변환] 시작')
  console.log('학생명:', studentName)
  console.log('핵심배움:', coreLearning)
  console.log('학습과정:', learningProcess)
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }
  
  if (!coreLearning || coreLearning.trim().length === 0) {
    throw new Error('핵심배움 내용이 없습니다.')
  }

  try {
    // 학습과정을 문장으로 변환
    const processText = learningProcess && learningProcess.length > 0
      ? learningProcess.join(', ')
      : '없음'

    // 프롬프트 생성 (개선 버전 1: 주어 제거)
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

    console.log('✅ 프롬프트 생성 완료')
    console.log('🌐 Gemini API 호출 시작')

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📡 응답 받음 - 상태 코드:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ API 오류:', errorData)
      throw new Error(`Gemini API 호출 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log('📥 응답 데이터:', data)
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const convertedText = candidate.content.parts[0].text.trim()
        console.log('✅ 변환 성공:', convertedText)
        return convertedText
      }
    }

    throw new Error('AI 변환 결과가 비어있습니다.')
  } catch (error) {
    console.error('❌ 배움기록 변환 실패:', error)
    throw error
  }
}
