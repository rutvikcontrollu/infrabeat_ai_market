from groq import Groq

client = Groq(
    api_key=" api_key_here "
)

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {
            "role": "user",
            "content": "Give me 5 startup ideas for AI agents"
        }
    ]
)

print(response.choices[0].message.content)