# 🪄 SiteGen - AI Website Generator

SiteGen is a full-stack **AI-powered website generator** built with the **MERN Stack**.
Describe a website in plain language and it plans the file structure, generates a complete React project, and lets you refine it with chat, edit the code, preview it live, publish it, or export it as a ZIP. Retrieval, guardrails, and an evaluation script keep the AI features measurable and safe.

---

## 🌐 Live Demo

- **Frontend:** https://~promptforge~-dev.vercel.app
- **Backend API:** https://promptforge-744l.onrender.com

---

## 📸 Screenshots

### Home

<img src="./demo/home.jpg" alt="Home" width="100%">

### Application

<table>
  <tr>
    <td><img src="./demo/auth.jpg" alt="" width="100%"></td>
    <td><img src="./demo/preview.jpg" alt="" width="100%"></td>
  </tr>
  <tr>
    <td><img src="./demo/builder.jpg" alt="" width="100%"></td>
    <td><img src="./demo/publish.jpg" alt="" width="100%"></td>
  </tr>
</table>

---

## ✨ Features

- 🤖 AI Website Generation (plan, then generate files in parallel)
- 💬 AI Chat for Modifying Generated Projects
- 🔎 Semantic Search Across Your Projects (embeddings)
- 🧠 Retrieval for Chat Edits (only relevant files are sent to the model)
- 🔁 Smart Retry for Failed Edits
- 🛡️ Guardrails: Prompt Checks, Unsafe-Code Scanning, Rate Limiting
- 🔐 JWT Authentication & Protected Routes
- 📁 Project & File Management with File Explorer
- 📝 Live Code Editor
- 👁️ Real-Time Live Preview
- 💾 Automatic Project Saving
- 🚀 One-Click Website Publishing
- 📦 Download Generated Projects as ZIP

---

## 🧠 How the AI Works

- **Generation:** the model first plans the files, then each file is generated in parallel with retries, validated, and auto-fixed.
- **Semantic search:** each project's prompt is embedded and compared by cosine similarity, so "online store" finds an "e-commerce site for shoes".
- **Retrieval for edits:** files are split into chunks and embedded. For each chat request, the closest files are retrieved, so the model sees only what it needs instead of the whole project.
- **Smart retry:** if part of an edit can't be applied, the model gets the exact errors and the full failing files for one more attempt.
- **Guardrails:** prompts are validated and checked for instruction-override attempts, generated code is scanned for unsafe patterns, and AI endpoints are rate limited per user.

### Evaluation

Run `node scripts/evaluate.js <projectId>` from the `server` folder.

| Measure | Result |
|---|---|
| Edit requests evaluated | 8 |
| Top 3 of 11 files (by embeddings) contained a file to edit | 8/8 |
| Code sent to the model compared with sending all files | ~38% |
| Guardrail checks (12 prompts, 8 code snippets) | 20/20 |

This is a small benchmark on one project. Edit quality was not measured.

---

## 🛠️ Tech Stack

**Frontend:** React, JavaScript, Vite, Tailwind CSS, React Router, Axios, Sandpack, Lucide React, React Hot Toast

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, Bcrypt, Zod

**AI:** Vercel AI SDK, OpenRouter (LLM and Embeddings), Cosine-similarity retrieval

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/harsh0190/PromptForge.git

# Install dependencies
cd client && npm install
cd ../server && npm install

# Start development servers
npm run dev
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a Pull Request.

If you found this project helpful, consider giving it a ⭐ on GitHub.
