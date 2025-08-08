const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

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

// Helper function to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data:image/jpeg;base64, or data:image/png;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

// GPT-4 Vision API for image analysis
export const analyzeImageWithGPT4Vision = async (
  file: File,
  prompt?: string,
): Promise<{
  description: string
  extractedText: string
  documentType: string
  keyElements: string[]
}> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  try {
    const base64Image = await fileToBase64(file)

    // Log the image details for debugging
    console.log('GPT-4 Turbo Vision Analysis Details:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      base64Length: base64Image.length,
      imagePreview: `data:${file.type};base64,${base64Image.substring(0, 50)}...`,
      isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(base64Image),
      dataURL: `data:${file.type};base64,${base64Image.substring(0, 100)}...`,
    })

    const analysisPrompt =
      prompt ||
      `I need you to carefully examine this image and provide accurate counts.

Please look at this image and tell me:

1. Can you see this image clearly?
2. What type of document is this (floor plan, blueprint, photo, etc.)?
3. CAREFULLY COUNT each distinct room or space you can see:
   - Count each individual office space (usually rectangular rooms)
   - Count executive offices separately if they're labeled differently
   - Count conference rooms, meeting rooms
   - Count bathrooms, storage rooms, reception areas
   - Count any other distinct spaces

COUNTING INSTRUCTIONS:
- Look at the walls and boundaries to identify separate rooms
- Each enclosed space with walls around it counts as one room
- Don't count hallways or open areas as rooms
- Be systematic: scan from left to right, top to bottom
- If rooms are labeled, read the labels to help identify room types

4. What text and labels can you read in the image?
5. What are the key visual elements you observe?

Take your time to count accurately. Double-check your counts before responding.

Return as JSON:
{
  "description": "Detailed description of what I can see...",
  "extractedText": "All text and labels I can read...",
  "documentType": "Type of document...",
  "keyElements": ["Specific counts: '8 individual offices', '2 executive offices', '1 conference room', etc."]
}`

    // Log the prompt details for debugging
    console.log('Sending explicit visual analysis prompt:', {
      promptLength: analysisPrompt.length,
      promptPreview: analysisPrompt.substring(0, 200) + '...',
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo', // Try GPT-4 Turbo which has strong vision capabilities
        messages: [
          {
            role: 'system',
            content:
              'You are GPT-4 Turbo with vision capabilities. You can see and analyze images with high accuracy. When counting rooms in floor plans, examine each enclosed space carefully and provide accurate counts. Take time to systematically identify and count each distinct room or area. Be precise and methodical in your visual analysis.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 4000, // Increased for detailed analysis responses
        temperature: 0.1, // Very low temperature for precise, accurate counting
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GPT-4 Vision API Error:', errorText)
      throw new Error(
        `GPT-4 Vision API error: ${response.status} - ${errorText}`,
      )
    }

    const data = await response.json()

    // Log the API response for debugging
    console.log('GPT-4 Turbo Vision API Response:', {
      status: response.status,
      usage: data.usage,
      model: data.model,
      responseLength: JSON.stringify(data).length,
      fullContent: data.choices?.[0]?.message?.content,
    })

    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response structure from GPT-4 Vision API')
    }

    const content = data.choices[0].message.content

    try {
      // Try to parse as JSON
      const analysis = JSON.parse(content)

      // Validate the expected structure
      return {
        description: analysis.description || 'No description available',
        extractedText: analysis.extractedText || '',
        documentType: analysis.documentType || 'Unknown',
        keyElements: Array.isArray(analysis.keyElements)
          ? analysis.keyElements
          : [],
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response, using fallback parsing')

      // Fallback: extract information from text response
      return {
        description: content,
        extractedText: '',
        documentType: 'Image',
        keyElements: [],
      }
    }
  } catch (error) {
    console.error('GPT-4 Vision analysis error:', error)
    throw error instanceof Error
      ? error
      : new Error('Failed to analyze image with GPT-4 Vision')
  }
}
