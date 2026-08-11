# 🚀 InfraBeat — Market Intelligence

Search any product or idea and get:
- **AI market report** (Groq / Llama 3.3)
- **Demand & competition scores** with an opportunity gauge
- **Real product images + buying links** (Google Shopping via SerpAPI)
- **Top GitHub projects** and **news volume** for the keyword

---

## Project structure

```
AI_market/
├── app.py                      # Flask backend (API)
├── requirements.txt            # Python dependencies
├── Procfile                    # For deployment (gunicorn)
├── .env                        # Your secret keys (NOT committed)
├── .env.example                # Template for .env
├── services/
│   ├── github_service.py       # GitHub repo search
│   ├── news_service.py         # Google News volume
│   └── product_service.py      # Google Shopping products  ← NEW
└── frontend/
    ├── .env                    # REACT_APP_API_URL
    └── src/
        ├── App.js              # Main UI
        ├── App.css             # Design system
        └── components/
            ├── Sidebar.js
            └── ChatArea.js
```

---

## 1. Backend setup

```bash
# from the AI_market folder
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create your `.env` file (copy from the template):

```bash
cp .env.example .env
```

Then edit `.env` and fill in:

| Key            | Required? | Where to get it                         |
|----------------|-----------|------------------------------------------|
| `GROQ_API_KEY` | Yes       | https://console.groq.com (free)          |
| `SERPAPI_KEY`  | Optional  | https://serpapi.com (100 free/month)     |

> Without `SERPAPI_KEY` the app runs fine — you just won't see product cards.

Run the backend:

```bash
python app.py
```

It starts on **http://localhost:5000**.

---

## 2. Frontend setup

```bash
cd frontend
npm install
npm start
```

It opens **http://localhost:3000** and talks to the backend at the URL in
`frontend/.env` (`REACT_APP_API_URL`, defaults to `http://localhost:5000`).

---

## 3. Use it

1. Make sure **both** servers are running (Flask on :5000, React on :3000).
2. Type a search like `3D Printer` and hit **Analyze**.
3. You'll get the AI report, scores, **product cards with images and buy links**,
   and top GitHub projects.
4. Click any recent search in the sidebar to re-run it.

---

## How the product feature works

`services/product_service.py` calls SerpAPI's Google Shopping engine and returns
each item's title, thumbnail image, price, store, rating, and product link.
`app.py` adds these to the `/analyze` response as a `products` array, and
`App.js` renders them as a grid of clickable cards.

To change the shopping region, edit `gl` (country) and `hl` (language) in
`product_service.py`. It's currently set to India (`gl: "in"`).

---

## Deployment notes

- **Backend:** the included `Procfile` uses gunicorn (`web: gunicorn app:app`).
  Works on Render, Railway, etc. Set `GROQ_API_KEY` and `SERPAPI_KEY` as
  environment variables in your host's dashboard.
- **Frontend:** run `npm run build` and deploy the `build/` folder to Vercel /
  Netlify. Set `REACT_APP_API_URL` to your live backend URL.
