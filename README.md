# My Money

Personal monthly expense tracker with grouped recurring purchases. Data stays in your browser (`localStorage`). Default currency is Indian Rupee (₹).

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## Core behaviour

Repeated buys of the same item (ignoring case and extra spaces) stay on **one row**. Every purchase is still stored and visible in item details and History. Use **Create new item** only when you want a separate row on purpose.
