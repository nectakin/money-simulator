# Money Simulator

Interactive web application for simulating purchases with a virtual balance, AI-generated item images, wishlist management, purchase history, and automatic balance replenishment.

### [Live Demo ↗](https://money-simulator.kvs171005.workers.dev/)

## Overview

Money Simulator is an interactive full-stack web application that allows users to simulate purchases using a virtual balance.

Users can search for almost any item, generate a product image with AI, view an estimated price, purchase the item, or save it to a wishlist.

The application also keeps track of purchase history, total spending, and automatically replenishes the virtual balance over time.

## Features

- Virtual starting balance
- Automatic balance replenishment
- Item search and generation
- AI-generated product images
- Estimated item prices
- Purchase system
- Wishlist
- Purchase history
- Total spending calculation
- Persistent state with LocalStorage
- Responsive interface
- Loading and error states
- API rate limiting
- Per-user generation limits
- Global generation limits
- Restricted CORS access

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Node.js
- Express
- Hugging Face Inference API
- Upstash Redis
- Cloudflare Workers
- Render

## How It Works

```text
User enters an item
        ↓
Frontend sends a request to the backend
        ↓
API rate limits are checked
        ↓
Hugging Face generates the item image
        ↓
The application estimates the item price
        ↓
User can purchase the item
or add it to the wishlist
        ↓
Application state is saved in LocalStorage 
```

## Project structure
```text
money-simulator/
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.jsonc
│
├── server/
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── README.md
```

## Key Implementation Details
### AI image generation

The frontend sends the user's item request to the Node.js backend. The backend prepares the prompt and sends it to the Hugging Face Inference API to generate a product-style image.

### Virtual purchase system

Users can purchase generated items using a virtual balance. Purchased items are added to the purchase history, while the total spending amount is calculated automatically.

### Wishlist

Generated items can be saved to a wishlist and purchased later without generating them again.

### Persistent application state

The application stores the balance, wishlist, purchase history, and other relevant state in LocalStorage, allowing the data to persist between browser sessions.

### API protection

AI generation requests are protected using Upstash Redis rate limiting.

The application limits the number of requests per user as well as the total number of AI generations available within a defined period.

The backend also restricts CORS access to the production frontend.

### Deployment

The frontend is deployed using Cloudflare Workers, while the Node.js backend is hosted on Render.

Environment variables are used to keep API tokens and service credentials outside of the source code.

### Live Website

**[Open Money Simulator ↗](https://money-simulator.kvs171005.workers.dev/)**

### Author

Made by Veronika Kuzmenko.

Full-stack web development project created as part of my portfolio.
