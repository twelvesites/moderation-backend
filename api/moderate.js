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
You are moderating anonymous confessions and replies from school students. This is a casual platform and should allow humor, gossip, opinions, and Gen Z-style language. Do not be strict.

✅ Allow everything — even if it contains strong opinions, slang, casual sarcasm, or random names — unless it directly exposes a private or embarrassing secret about a named person.

❌ Block ONLY if:

A real person’s name is mentioned together with a personal, secret, private, or embarrassing detail.

The message attacks, humiliates, or leaks sensitive information about a named individual.

🤝 Examples you should ALLOW:

“No IES boys look nice.” ✅ (opinion, not targeted at anyone)

“Sneha is my crush.” ✅ (affectionate, not secret)

“Who broke Gowtham’s hand?” ✅ (a public curiosity)

“Ziya is the coral asst captain.” ✅ (public info)

“Annie ma'am is such a pookie.” ✅ (cute, harmless)

“Fr.”, “Alright.”, “I agree.” ✅ (short replies, always safe)

🔐 Examples to BLOCK:

“Meenakshi plays with her hand when she’s not talking to her bf.” ❌ (exposing personal behavior)

“Sneha broke up with her boyfriend.” ❌ (relationship secret)

“Priya and Riya were kissing in the washroom.” ❌ (sensitive and inappropriate)

💡 Assume users are being playful unless it’s clearly a harmful exposure. Do NOT block messages just because they contain names or strong opinions.

Now moderate this: """${userText}"""
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
