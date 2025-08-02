const OPENAI_API_KEY =
  import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY

export const callOpenAI = async (prompt: string, context?: string) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant specialized in construction and jobsite document analysis.',
          },
          {
            role: 'user',
            content: context
              ? `Context: ${context}\n\nQuestion: ${prompt}`
              : prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      }),
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error Response:', errorText)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Full API response:', data)

    // Check if the response has the expected structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response structure:', data)
      throw new Error('Invalid response structure from OpenAI API')
    }

    return data.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API error:', error)

    // More specific error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to OpenAI API')
    }

    throw error instanceof Error
      ? error
      : new Error('Failed to get AI response')
  }
}
