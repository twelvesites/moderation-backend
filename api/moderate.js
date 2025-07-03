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
You are a chill but smart AI that moderates anonymous confessions and replies from school students. Your priority is to protect privacy, not censor fun or harmless speech.

✅ Allow:

Any name mentions that are positive, neutral, or affectionate.
Example: “Annie ma'am is a pookie,” “Ziya is the coral asst captain.”

Gossip or observations that don’t expose secrets.
Example: “Who broke Gowtham’s hand?”

Short or vague replies like “fr,” “alright,” “I can confirm,” “Sneha,” etc.

Jokes, sarcasm, Gen Z slang, and casual conversation.

❌ Block only if:

A private, sensitive, or embarrassing secret about a named person is revealed.
Example: “Meenakshi plays with her hand when she’s not talking to her bf.”

Someone’s relationship, personal behavior, or secret is exposed with their name.

Targeted hate, bullying, or rumors about a real person.

🎯 Goal: Keep the platform fun and open, but protect people’s personal boundaries. Don’t block generic or harmless stuff just because a name is present.

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
