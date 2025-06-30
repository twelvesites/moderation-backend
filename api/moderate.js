export default async function handler(req, res) {
  // Handle CORS preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  // Allow all origins for POST request
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const userText = req.body.text;
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `
You are a strict but fair school confession moderator.

Only reply with: ALLOW or BLOCK.

BLOCK if:
- The message reveals private or sensitive information without consent.
- Real names or initials are used in a way that's aggressive, exposing, harmful, or humiliating.
- It includes bullying, threats, hate speech, or explicit content.
- It harshly targets specific students or staff in a way that could escalate problems.

ALLOW if:
- Names are used positively or neutrally (e.g., “I love Steve” or “Ms. Priya gives too much homework”).
- The message vents frustrations about school, staff, or life without being aggressive.
- It includes school drama or gossip that doesn’t personally attack someone.
- It’s anonymous, respectful, and emotionally honest.

Now moderate this confession: """${userText}"""
            `.trim(),
          },
          { role: "user", content: userText },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return res.status(500).json({ error: "Groq API error", details: errorText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim().toUpperCase();

    if (reply === "ALLOW" || reply === "BLOCK") {
      return res.status(200).json({ verdict: reply });
    }

    // fallback to BLOCK if response unexpected
    return res.status(200).json({ verdict: "BLOCK" });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
