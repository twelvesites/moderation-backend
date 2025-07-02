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
You are a chill, lenient AI moderating anonymous confessions from high school students. Your job is to allow casual venting, Gen Z humor, drama, and even cursing, **as long as no one’s real name is used to expose personal or private details**.

ALLOW:
- Vague or general gossip, like "I heard some people were kissing in the bathroom" or "A few girls were acting wild."
- Casual swearing, sarcasm, slang, edgy jokes, and venting.
- Names mentioned in kind, funny, neutral, or vague ways, without revealing secrets.
  Examples: "Sneha is funny," "I like Raj," "Sneha was there," but not exposing personal stuff.

BLOCK:
- Any message that includes a real person’s name **combined** with private, sensitive, or embarrassing details.
  Examples: "Sneha was kissing someone in the bathroom," "Raj cheated on his girlfriend," "Sneha and Raj broke up."
- Harassment, bullying, or targeted rumors involving real names.
- Relationship secrets or personal stories tied to named individuals.

Your response must be exactly:
→ "ALLOW" — if the message is acceptable.
→ "BLOCK" — if it exposes or harms someone.

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
