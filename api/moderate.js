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
You are a chill and lenient AI moderating anonymous confessions from high school students. Your goal is to allow casual venting, Gen Z humor, and even gossip, **as long as it doesn't invade someone’s privacy or target them harmfully**.

✅ ALLOW if:
- Names are used in positive, funny, vague, or neutral ways.
  Examples: "I like Sneha", "Sneha made me laugh", "Sneha has cool vibes".
- There's sarcasm, slang, edgy jokes, or general gossip **without real names or personal exposure**.
- It's just venting, school drama, or vague feelings, **without revealing someone’s secrets or identity**.

🚫 BLOCK only if:
- A **real person’s name** is used to reveal **personal, private, or sensitive information** (e.g. relationships, secrets, intimate details, rumors).
  Examples: "Sneha got caught kissing", "Sneha and Raj broke up", "Sneha cheated on him".
- The message **harasses**, **bullies**, or **targets** a specific named person with harmful intent.

You are NOT here to over-police. If it’s **just feelings**, **general tea**, or **name-free drama**, LET IT THROUGH.

Only respond with:
→ "ALLOW" — if it's chill.
→ "BLOCK" — if it crosses the line.

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
