/**
 * Cloudflare Functions: Gemini API - 생활기록부 변환
 * - 도와준 내용 → 생활기록부 형식 변환
 * - 배움기록 → 생활기록부 형식 변환
 */

const AI_MODEL = 'gemini-2.0-flash'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models'

export async function onRequest(context) {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // POST 요청만 허용
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    // 환경 변수에서 API 키 가져오기
    const apiKey = context.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: corsHeaders
      })
    }

    // 요청 본문 파싱
    const body = await context.request.json()
    const { type, helpDescription, studentName, coreLearning, learningProcess } = body

    let prompt = ''

    // 타입에 따라 프롬프트 생성
    if (type === 'help') {
      // 도와준 내용 변환
      if (!helpDescription) {
        return new Response(JSON.stringify({ error: 'helpDescription is required' }), {
          status: 400,
          headers: corsHeaders
        })
      }

      prompt = `다음은 초등학생이 친구를 도와준 내용입니다. 이것을 초등학교 생활기록부에 기록할 한 문장으로 변환하세요.

규칙:
- 반드시 한 문장으로만 작성
- 50자 이내로 간결하게
- "~함", "~하였음" 등 서술형 종결어미 사용
- 설명이나 부연 없이 변환된 문장만 출력
- 학생의 긍정적인 행동 강조

원본: ${helpDescription}

변환:`

    } else if (type === 'learning') {
      // 배움기록 변환
      if (!coreLearning) {
        return new Response(JSON.stringify({ error: 'coreLearning is required' }), {
          status: 400,
          headers: corsHeaders
        })
      }

      const processText = learningProcess && learningProcess.length > 0
        ? learningProcess.join(', ')
        : '없음'

      prompt = `다음은 초등학생의 배움기록입니다. 이를 생활기록부 형식으로 변환하세요.

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

    } else {
      return new Response(JSON.stringify({ error: 'Invalid type. Use "help" or "learning"' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Gemini API 호출
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

    const response = await fetch(
      `${GEMINI_API_URL}/${AI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return new Response(JSON.stringify({ 
        error: 'Gemini API error', 
        details: errorData 
      }), {
        status: response.status,
        headers: corsHeaders
      })
    }

    const data = await response.json()

    // 응답에서 텍스트 추출
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const convertedText = candidate.content.parts[0].text.trim()
        
        return new Response(JSON.stringify({ 
          convertedText,
          usageMetadata: data.usageMetadata 
        }), {
          status: 200,
          headers: corsHeaders
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
      status: 500,
      headers: corsHeaders
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}
