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
        model: "gemma2-9b-it",
        max_tokens: 2,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `
You are an AI content moderator for an anonymous school confession platform.

Your goal is to protect student privacy without being overly strict. Be chill, lenient, and modern — let students speak freely unless they're leaking someone's secret or harming someone.

---

✅ ALLOW if the message:
- Mentions names casually or affectionately ("Sneha is cute", "Gowtham is my crush")
- Shares gossip that doesn’t reveal *private* or *sensitive* info
- Is a rant, joke, opinion, roast, or school discussion
- Uses Gen Z slang, sarcasm, or emoji
- Is a short reply like "fr", "alright", "who", "confirmed", "same", etc.
- Mentions a name and their *public* role ("Ziya is Coral Asst Captain")

🚫 BLOCK only if the message:
- Reveals a relationship, secret, or private behavior of someone and includes their name
  > e.g. "Priya kissed her bf in the washroom"
- Targets or humiliates someone unfairly
- Shares secrets or rumors linked to a real name or clear identity

---

🧠 Respond with ONLY one word:
- ALLOW
- BLOCK

No explanation, no extra text. Only ALLOW or BLOCK.

Now moderate this:: """${userText}"""
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
