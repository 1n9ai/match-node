# 1n9 Match

Check documents against a set of requirements (a checklist) on top of the same 1n9 central engine that powers the 1n9 chatbot.

1. Create a **checklist** and list its requirements. You can paste the text that states them and let AI split it into items.
2. Upload the **documents** to check (PDF, DOCX, TXT, MD). Scanned PDFs are read with OCR.
3. Click **Check documents**. Every document is checked against every requirement. For each item you see **found / unclear / not found**, plus the passage from the document that supports it.

Ordering follows fixed rules in code: documents that meet every mandatory item come first, then more required items found, then stronger matches. No chat model writes a score or a verdict. Every result points back to text in the document, so a reviewer can check it quickly. **Final decisions stay with people.**

The UI is available in English, ไทย, 日本語 and 中文 (switch at the top right) and works on phones and tablets.

## How it fits together

```
browser ──▶ 1n9 Match (this repo, your machine) ──▶ 1n9 central (processing)
                     │                                      │
                     └── data/ (settings, documents)        └── your AI provider + your vector DB (BYOK)
```

- This app is thin. Parsing, OCR, chunking, embedding, search and rerank all run on central.
- You bring your own AI keys (BYOK) and your own vector database (Qdrant, PostgreSQL + pgvector, or Pinecone).
- One checklist = one collection in your vector database. Deleting a checklist deletes its vectors and files.
- The app only calls out to central. No inbound port or public IP is needed.

## Run with Docker

```bash
cp .env.example .env     # set CENTRAL_URL, LICENSE_KEY, NODE_PASSWORD
docker compose up -d --build
```

Open http://127.0.0.1:8081, then go to **Settings**:

1. **AI connections**: add a provider (any OpenAI-compatible API, Gemini or Ollama).
2. **Model library**: add an LLM and an embedding model, and optionally a rerank model. Press **Test** to auto-fill the embedding dimension.
3. **Infrastructure**: set your vector database.
4. Press **Check everything**.

To open it to other machines on your network, set `NODE_BIND=0.0.0.0`. Always set `NODE_PASSWORD`, because the documents you check can be confidential.

Data lives in the `match-data` volume. Back up `node.db` and `secret.key` together.

## License

One license = one installed system. If the same key is used on a second installation, the most recent one wins and the other disconnects.

The code in this repository is released under the MIT License, see [LICENSE](LICENSE). Using it with the 1n9 AI service still requires a valid license key.

The "1n9 AI" name and logo are trademarks of the owner and are not covered by the MIT License. If you redistribute or modify the code, use your own name and logo.

## Develop

```bash
pip install -r requirements.txt
uvicorn app:app --reload --port 8080          # backend
cd frontend && npm install && npm run dev     # UI on :3000 (set NEXT_PUBLIC_API_URL=http://127.0.0.1:8080)
```

All UI text lives in `frontend/locales/{en,th,ja,zh}.json`. `npm run build` fails if a component contains hard-coded Thai/CJK text or if a language is missing a key. Server errors return `{code, message, params}`, and the UI translates `errors.<code>`.
