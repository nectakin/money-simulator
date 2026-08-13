import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Heart,
  Search,
  Sparkles,
  Wallet,
  ShoppingBag,
  Receipt,
} from "lucide-react";

const START_BALANCE = 1_000_000;
const INCOME_AMOUNT = 100_000;
const INCOME_INTERVAL_MS = 3 * 60 * 1000;
const STORAGE_KEY = "money_simulator_fullstack_state";
const API_BASE =  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type Item = {
  id: string;
  name: string;
  price: number;
  image: string;
  createdAt: number;
};

type GameState = {
  balance: number;
  wishlist: Item[];
  purchased: Item[];
  nextIncomeAt: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ");
}

function makeSeed(prompt: string) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash * 31 + prompt.charCodeAt(i)) >>> 0;
  }
  return hash || 42;
}

function estimatePrice(prompt: string) {
  const text = prompt.toLowerCase();
  let base = 12_000;

  const rules: Array<[RegExp, number]> = [
    [/tesla|model s|cybertruck|ferrari|lamborghini|porsche/, 120_000],
    [/red|black|white|blue|limited|special/, 8_000],
    [/house|villa|penthouse|mansion/, 900_000],
    [/watch|rolex|patek/, 35_000],
    [/yacht|boat|ship/, 1_500_000],
    [/phone|iphone|samsung|pixel/, 1_200],
    [/laptop|macbook|pc|computer/, 2_200],
    [/diamond|gold|jewelry|ring/, 25_000],
    [/art|painting|sculpture/, 18_000],
    [/bike|bicycle|motorcycle/, 9_000],
    [/airplane|jet/, 8_000_000],
    [/camera|canon|sony|nikon/, 3_000],
    [/sofa|chair|table|bed/, 2_500],
    [/apartment|flat/, 250_000],
    [/gaming|pro|max|ultra/, 4_000],
    [/vintage|rare|collectible/, 30_000],
  ];

  for (const [regex, add] of rules) {
    if (regex.test(text)) base += add;
  }

  const lengthBonus = Math.min(prompt.length * 110, 18_000);
  const pseudoRandom = (makeSeed(prompt) % 25_000) + 1_000;

  return Math.max(500, Math.round((base + lengthBonus + pseudoRandom) / 100) * 100);
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        balance: START_BALANCE,
        wishlist: [],
        purchased: [],
        nextIncomeAt: Date.now() + INCOME_INTERVAL_MS,
      };
    }

    const parsed = JSON.parse(raw) as GameState;

    return {
      balance: Number.isFinite(parsed.balance) ? parsed.balance : START_BALANCE,
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      purchased: Array.isArray(parsed.purchased) ? parsed.purchased : [],
      nextIncomeAt:
        Number.isFinite(parsed.nextIncomeAt) && parsed.nextIncomeAt > 0
          ? parsed.nextIncomeAt
          : Date.now() + INCOME_INTERVAL_MS,
    };
  } catch {
    return {
      balance: START_BALANCE,
      wishlist: [],
      purchased: [],
      nextIncomeAt: Date.now() + INCOME_INTERVAL_MS,
    };
  }
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function generateImageViaBackend(prompt: string) {
  const response = await fetch(`${API_BASE}/api/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Не вдалося згенерувати зображення");
  }

  return data.imageBase64 as string;
}

function ItemCard({
  item,
  onBuy,
  onWishlist,
  onDelete,
  compact = false,
}: {
  item: Item;
  onBuy?: (item: Item) => void;
  onWishlist?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl ${
        compact ? "flex gap-4 p-4" : ""
      }`}
    >
      <div
  className={
    compact
      ? "h-32 w-40 shrink-0 overflow-hidden rounded-2xl bg-slate-900"
      : "flex items-center justify-center overflow-hidden rounded-t-3xl bg-slate-950/60 p-6"
  }>
  <img
    src={item.image}
    alt={item.name}
    className={
      compact
        ? "h-full w-full object-cover"
        : "max-h-[420px] w-auto max-w-full rounded-2xl object-contain"
    } />
        </div>

      <div className={compact ? "flex flex-1 items-center justify-between gap-4" : "p-5"}>
        <div className="text-left">
          <div className="text-lg font-semibold text-white">{item.name}</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {formatMoney(item.price)}
          </div>
        </div>

        <div className={`flex ${compact ? "flex-col" : "mt-5"} gap-3`}>
          {onBuy && (
            <button
              onClick={() => onBuy(item)}
              className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] hover:bg-emerald-400"
            >
              Купити
            </button>
          )}

          {onWishlist && (
            <button
              onClick={() => onWishlist(item)}
              className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 font-semibold text-white transition hover:scale-[1.02] hover:bg-white/12"
            >
              Додати в бажане
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 font-semibold text-rose-200 transition hover:scale-[1.02] hover:bg-rose-500/20"
            >
              Видалити
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState());
  const [screen, setScreen] = useState<"menu" | "search" | "wishlist" | "purchased">("menu");
  const [query, setQuery] = useState("");
  const [generatedItem, setGeneratedItem] = useState<Item | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (now < state.nextIncomeAt) return;

    const passedIntervals = Math.floor((now - state.nextIncomeAt) / INCOME_INTERVAL_MS) + 1;

    setState((prev) => ({
      ...prev,
      balance: prev.balance + passedIntervals * INCOME_AMOUNT,
      nextIncomeAt: prev.nextIncomeAt + passedIntervals * INCOME_INTERVAL_MS,
    }));

    setMessage(`Нараховано ${formatMoney(passedIntervals * INCOME_AMOUNT)}`);
  }, [now, state.nextIncomeAt]);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timeout);
  }, [message]);

  const timeLeft = useMemo(
    () => Math.max(0, state.nextIncomeAt - now),
    [state.nextIncomeAt, now]
  );

  const totalSpent = useMemo(
    () => state.purchased.reduce((sum, item) => sum + item.price, 0),
    [state.purchased]
  );

  async function generateItem() {
    const clean = normalizePrompt(query);

    if (!clean) {
      setMessage("Спочатку введи пошуковий запит");
      return;
    }

    try {
      setIsGenerating(true);
      setMessage("Завантаження...");

      const imageBase64 = await generateImageViaBackend(clean);

      const item: Item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: clean,
        price: estimatePrice(clean),
        image: imageBase64,
        createdAt: Date.now(),
      };

      setGeneratedItem(item);
      setMessage("Предмет згенеровано");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не вдалося згенерувати зображення");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function buyItem(item: Item, fromWishlist = false) {
    setState((prev) => {
      if (prev.balance < item.price) {
        setMessage("Недостатньо коштів");
        return prev;
      }

      const nextWishlist = fromWishlist
        ? prev.wishlist.filter((w) => w.id !== item.id)
        : prev.wishlist;

      const purchasedItem = {
        ...item,
        id: `${item.id}_purchased_${Date.now()}`,
      };

      setMessage(`Куплено: ${item.name}`);

      return {
        ...prev,
        balance: prev.balance - item.price,
        wishlist: nextWishlist,
        purchased: [purchasedItem, ...prev.purchased],
      };
    });
  }

  function addToWishlist(item: Item) {
    setState((prev) => {
      const exists = prev.wishlist.some(
        (w) => w.name.toLowerCase() === item.name.toLowerCase()
      );

      if (exists) {
        setMessage("Цей предмет уже в бажаному");
        return prev;
      }

      setMessage("Додано в бажане");
      return { ...prev, wishlist: [item, ...prev.wishlist] };
    });
  }

  function removeFromWishlist(item: Item) {
    setState((prev) => ({
      ...prev,
      wishlist: prev.wishlist.filter((w) => w.id !== item.id),
    }));
    setMessage("Видалено з бажаного");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b,_#020617_55%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-2xl"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-slate-300">
                <Sparkles className="h-4 w-4" /> Money Simulator
              </div>
              <div className="text-4xl font-black text-emerald-400 sm:text-5xl lg:text-6xl">
                {formatMoney(state.balance)}
              </div>
              <div className="mt-2 text-slate-300">Баланс</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-slate-300">
                  <Clock3 className="h-4 w-4" /> Наступне поповнення
                </div>
                <div className="text-3xl font-bold">{formatTime(timeLeft)}</div>
                <div className="mt-1 text-sm text-slate-400">
                  + {formatMoney(INCOME_AMOUNT)} кожні 3 хвилини
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-slate-300">
                  <Wallet className="h-4 w-4" /> Бажане
                </div>
                <div className="text-3xl font-bold">{state.wishlist.length}</div>
                <div className="mt-1 text-sm text-slate-400">Предметів збережено</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="h-4 w-4" /> Куплене
                </div>
                <div className="text-3xl font-bold">{state.purchased.length}</div>
                <div className="mt-1 text-sm text-slate-400">Успішних покупок</div>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.25 }}
              className="fixed top-6 left-1/2 z-50 -translate-x-1/2
                 rounded-2xl border border-emerald-400/20 
                 bg-emerald-500/10 px-8 py-5 text-sm text-emerald-200 
                 backdrop-blur-xl shadow-2xl"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {screen === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="mb-2 text-3xl font-bold">Головне меню</div>
              <div className="mb-8 max-w-2xl text-slate-300">
                Шукай будь-який предмет, дивись ціну, купуй одразу або додавай у список бажаного та переглядай список покупок.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => setScreen("search")}
                  className="group rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5 text-left transition hover:-translate-y-1 hover:bg-slate-900/70"
                >
                  <Search className="mb-4 h-8 w-8 text-cyan-300" />
                  <div className="text-xl font-bold">Пошук</div>
                  <div className="mt-2 text-slate-300">Згенерувати предмет, фото та ціну</div>
                </button>

                <button
                  onClick={() => setScreen("wishlist")}
                  className="group rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5 text-left transition hover:-translate-y-1 hover:bg-slate-900/70"
                >
                  <Heart className="mb-4 h-8 w-8 text-pink-300" />
                  <div className="text-xl font-bold">Бажане</div>
                  <div className="mt-2 text-slate-300">
                    Перегляд, видалення або покупка зі списку
                  </div>
                </button>
              </div>

              <button
                onClick={() => setScreen("purchased")}
                className="mt-4 w-full rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5 text-left transition hover:-translate-y-1 hover:bg-slate-900/70"
              >
                <ShoppingBag className="mb-4 h-8 w-8 text-emerald-300" />
                <div className="text-xl font-bold">Список покупок</div>
                <div className="mt-2 text-slate-300">
                  Перегляд усіх покупок та загальної суми витрат
                </div>
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/10 to-emerald-500/10 p-6 backdrop-blur-xl">
              <div className="mb-2 text-2xl font-bold">Як це працює</div>
              <ul className="space-y-3 text-slate-200">
                <li>Початковий баланс — $1,000,000.</li>
                <li>Шукай будь-який предмет — система згенерує його зображення та приблизну вартість.</li>
                <li>Купуй предмети або додавай їх до списку бажаного.</li>
                <li>Баланс автоматично поповнюється на $100,000 кожні 3 хвилини.</li>
              </ul>
            </div>
          </motion.div>
        )}

        {screen === "search" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <button
              onClick={() => setScreen("menu")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Назад
            </button>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="mb-3 text-3xl font-bold">Пошук предмета</div>
              <div className="mb-5 text-slate-300">
                Наприклад: Tesla Model S red, luxury penthouse in Kyiv, gold Rolex watch
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateItem()}
                  placeholder="Введи, що хочеш знайти"
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-lg outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                />
                <button
                  onClick={generateItem}
                  disabled={isGenerating}
                  className="rounded-2xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isGenerating ? "Генеруємо..." : "Згенерувати"}
                </button>
              </div>
            </div>

            {generatedItem && (
              <ItemCard item={generatedItem} onBuy={buyItem} onWishlist={addToWishlist} />
            )}
          </motion.div>
        )}

        {screen === "purchased" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <button
              onClick={() => setScreen("menu")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Назад
            </button>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-slate-300">
                  <ShoppingBag className="h-5 w-5" /> Всього покупок
                </div>
                <div className="text-4xl font-black text-white">{state.purchased.length}</div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-slate-300">
                  <Receipt className="h-5 w-5" /> Всього витрачено
                </div>
                <div className="text-4xl font-black text-emerald-400">{formatMoney(totalSpent)}</div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="mb-5 text-2xl font-bold">Список покупок</div>
              <div className="space-y-4">
                <AnimatePresence>
                  {state.purchased.map((item) => (
                    <ItemCard key={item.id} item={item} compact />
                  ))}
                </AnimatePresence>

                {state.purchased.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
                    Поки що нічого не куплено.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {screen === "wishlist" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <button
              onClick={() => setScreen("menu")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Назад
            </button>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold">Список бажаного</div>
                  <div className="text-slate-300">
                    Видалення або придбання товару тут і зараз
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                  Усього: {state.wishlist.length}
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {state.wishlist.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      compact
                      onBuy={(current) => buyItem(current, true)}
                      onDelete={removeFromWishlist}
                    />
                  ))}
                </AnimatePresence>

                {state.wishlist.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-slate-400">
                    Список бажаного порожній.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}