"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Search, Star, Flame, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface FuturesCoin {
  symbol: string
  baseAsset: string
  volume_24h: number
  price: number
  priceChangePercent: number
}

interface CoinSearchProps {
  onSelect: (symbol: string) => void
  currentSymbol?: string
}

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

export default function CoinSearch({ onSelect, currentSymbol = "BTCUSDT" }: CoinSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [coins, setCoins] = useState<FuturesCoin[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const favs = localStorage.getItem("fav_coins")
    if (favs) setFavorites(JSON.parse(favs))
    loadCoins()
    const interval = setInterval(loadCoins, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadCoins = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/market/coins?limit=300`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCoins(data)
        localStorage.setItem("coins_cache", JSON.stringify(data))
      } else {
        console.warn("Unexpected coins response:", data)
      }
    } catch {
      const cached = localStorage.getItem("coins_cache")
      if (cached) setCoins(JSON.parse(cached))
    } finally {
      setLoading(false)
    }
  }

  const filteredCoins = useMemo(() => {
    if (!Array.isArray(coins)) return []
    if (!query) {
      const favs = coins.filter((c) => favorites.includes(c.baseAsset))
      const others = coins.filter((c) => !favorites.includes(c.baseAsset))
      return [...favs, ...others].slice(0, 50)
    }
    const q = query.toLowerCase()
    return coins
      .filter((c) => c.baseAsset.toLowerCase().includes(q))
      .slice(0, 20)
  }, [query, coins, favorites])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredCoins.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex((prev) => (prev + 1) % filteredCoins.length)
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) => (prev - 1 + filteredCoins.length) % filteredCoins.length)
          break
        case "Enter":
          e.preventDefault()
          if (filteredCoins[highlightedIndex]) {
            handleSelect(filteredCoins[highlightedIndex])
          }
          break
        case "Escape":
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    },
    [filteredCoins, highlightedIndex]
  )

  const handleSelect = (coin: FuturesCoin) => {
    onSelect(coin.symbol)
    setQuery("")
    setIsOpen(false)
    setHighlightedIndex(0)
  }

  const toggleFavorite = (e: React.MouseEvent, baseAsset: string) => {
    e.stopPropagation()
    const newFavs = favorites.includes(baseAsset)
      ? favorites.filter((f) => f !== baseAsset)
      : [...favorites, baseAsset]
    setFavorites(newFavs)
    localStorage.setItem("fav_coins", JSON.stringify(newFavs))
  }

  const formatVolume = (v: number) => {
    if (v > 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (v > 1e6) return `$${(v / 1e6).toFixed(1)}M`
    return `$${(v / 1e3).toFixed(1)}K`
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentBase = currentSymbol.replace("USDT", "")
  const selectedCoin = coins.find((c) => c.symbol === currentSymbol)

  return (
    <div ref={containerRef} className="relative w-72">
      <div
        className="relative flex items-center bg-[#0b0f19] border border-slate-700 rounded hover:border-amber-500/50 transition-colors cursor-pointer"
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
      >
        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : selectedCoin ? selectedCoin.baseAsset : currentBase}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full pl-10 pr-14 py-2 bg-transparent text-white font-mono text-sm placeholder-slate-500 focus:outline-none"
        />
        {!isOpen && selectedCoin && (
          <div className="absolute right-3 flex items-center gap-1 text-xs">
            <span className={selectedCoin.priceChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {selectedCoin.priceChangePercent >= 0 ? "+" : ""}
              {selectedCoin.priceChangePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-[#0b0f19] border border-slate-700 rounded shadow-2xl max-h-96 overflow-y-auto z-50"
          >
            <div className="px-3 py-2 text-[10px] text-slate-500 border-b border-slate-800 flex justify-between items-center">
              <span>{query ? `Found: ${filteredCoins.length}` : "Top by liquidity"}</span>
              <span className="text-slate-600">Binance Futures</span>
              {loading && <span className="text-amber-500 animate-pulse">⟳</span>}
            </div>

            {filteredCoins.map((coin, index) => {
              const isFav = favorites.includes(coin.baseAsset)
              const isSelected = coin.symbol === currentSymbol
              const isHot = coin.volume_24h > 1e9

              return (
                <div
                  key={coin.symbol}
                  onClick={() => handleSelect(coin)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex ? "bg-slate-800" : "hover:bg-slate-800/50"
                  } ${isSelected ? "border-l-2 border-amber-500 bg-amber-500/5" : "border-l-2 border-transparent"}`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isHot ? (
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                    ) : isFav ? (
                      <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white font-mono text-sm">{coin.baseAsset}</span>
                      <span className="text-[10px] text-slate-500">/USDT</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Vol {formatVolume(coin.volume_24h)}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono text-white">
                      ${coin.price.toLocaleString(undefined, {
                        minimumFractionDigits: coin.price < 1 ? 4 : 2,
                        maximumFractionDigits: coin.price < 1 ? 6 : 2,
                      })}
                    </div>
                    <div
                      className={`text-[10px] flex items-center justify-end gap-0.5 ${
                        coin.priceChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {coin.priceChangePercent >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(coin.priceChangePercent).toFixed(2)}%
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(e, coin.baseAsset)}
                    className={`p-1 rounded hover:bg-slate-700 transition-colors shrink-0 ${
                      isFav ? "text-yellow-400" : "text-slate-600"
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" fill={isFav ? "currentColor" : "none"} />
                  </button>
                </div>
              )
            })}

            {filteredCoins.length === 0 && (
              <div className="px-3 py-4 text-center text-slate-500 text-sm">
                No coins found on Binance Futures
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
