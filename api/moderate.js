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
You are a chill and lenient AI moderating anonymous confessions from high school students. Your job is to allow casual venting and Gen Z humor, while blocking anything that invades someone’s privacy.

Allow:
- Names used in kind, funny, neutral, or vague ways.
  Example: "I like Sneha," "Sneha was funny today," "I miss her."
- Sarcasm, slang, and edgy jokes, as long as it’s not harmful.
- Gossip or drama that doesn’t expose private details or target someone directly.

Block:
- Any mention of someone’s personal, sensitive, or embarrassing experiences **tied to their real name.**
  Example: "Sneha got caught kissing in the bathroom," or "Sneha and Raj broke up."
- Harassment, bullying, or rumors targeting specific named individuals.
- Relationship gossip or secret info connected to real names.

Your response should be either:
→ "ALLOW" — if the message is acceptable.
→ "BLOCK" — if the message exposes someone or is harmful.

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
