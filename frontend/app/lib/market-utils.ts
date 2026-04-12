// Market analysis helper functions
// Extracted from page.tsx for better testability

export const getRSIInterpretation = (rsi: number, timeframe: string): { text: string; color: string; detail: string } => {
  const thresholds = {
    "15": { overbought: 75, oversold: 25 },
    "60": { overbought: 72, oversold: 28 },
    "240": { overbought: 70, oversold: 30 },
    "D": { overbought: 65, oversold: 35 },
  }
  const tf = thresholds[timeframe as keyof typeof thresholds] || thresholds["60"]
  const tfLabel = timeframe === "15" ? "M15" : timeframe === "60" ? "1H" : timeframe === "240" ? "4H" : "1D"
  
  if (rsi > tf.overbought) {
    return { 
      text: `Перекуплен (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "скальп-шорт возможен" : timeframe === "D" ? "разворот тренда вероятен" : "рассмотреть фиксацию прибыли"
    }
  }
  if (rsi < tf.oversold) {
    return { 
      text: `Перепродан (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "скальп-лонг возможен" : timeframe === "D" ? "зона аккумуляции" : "отскок ожидается"
    }
  }
  return { 
    text: `Нейтрально (${tfLabel})`, 
    color: "text-amber-500",
    detail: timeframe === "15" ? "ждать пробоя" : timeframe === "D" ? "вероятно продолжение тренда" : "импульс накапливается"
  }
}

export const getMACDInterpretation = (macd: number, signal: number, timeframe: string): { text: string; color: string; detail: string } => {
  const isBullish = macd > signal
  const isPositive = macd > 0
  const tfLabel = timeframe === "15" ? "M15" : timeframe === "60" ? "1H" : timeframe === "240" ? "4H" : "1D"
  
  if (isBullish && isPositive) {
    return { 
      text: `Бычий (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "сдвиг импульса - быстрый скальп" : timeframe === "D" ? "сильный восходящий тренд подтверждён" : "тренд набирает силу"
    }
  }
  if (!isBullish && !isPositive) {
    return { 
      text: `Медвежий (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "импульс вниз - быстрый шорт" : timeframe === "D" ? "нисходящий тренд установлен" : "давление продавцов растёт"
    }
  }
  if (isBullish && !isPositive) {
    return { 
      text: `Пересечение вверх (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "ранний сигнал разворота" : timeframe === "D" ? "формируется крупный разворот" : "возможное дно"
    }
  }
  return { 
    text: `Пересечение вниз (${tfLabel})`, 
    color: "text-red-500",
    detail: timeframe === "15" ? "ранний сигнал слабости" : timeframe === "D" ? "формируется крупная вершина" : "возможный разворот"
  }
}

export const getFundingInterpretation = (funding: number, timeframe: string): { text: string; color: string; detail: string } => {
  const tfLabel = timeframe === "15" ? "Скальп" : timeframe === "60" ? "Внутри дня" : timeframe === "240" ? "Свинг" : "Позиция"
  
  if (funding > 0.03) {
    return { 
      text: `Экстремальный лонг (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "возможен сжим шортов - осторожно" : timeframe === "D" ? "недолговечно - крупная коррекция близка" : "риск сжима фандинга"
    }
  }
  if (funding > 0.01) {
    return { 
      text: `Лонги платят (${tfLabel})`, 
      color: "text-amber-500",
      detail: timeframe === "15" ? "небольшие издержки - терпимо для скальпа" : timeframe === "D" ? "избегать лонгов - плати каждые 8ч" : "уменьшить размер позиции"
    }
  }
  if (funding < -0.03) {
    return { 
      text: `Экстремальный шорт (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "возможен сжим лонгов - быстрые отскоки" : timeframe === "D" ? "капитуляция - дно формируется" : "шорты сжимаются"
    }
  }
  if (funding < -0.01) {
    return { 
      text: `Шорты платят (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "платят за лонги - преимущество скальпа" : timeframe === "D" ? "идеально для долгих позиций" : "аккумуляция выгодна"
    }
  }
  return { 
    text: `Сбалансировано (${tfLabel})`, 
    color: "text-muted-foreground",
    detail: "нет давления фандинга в любом направлении"
  }
}

export const getCVDInterpretation = (cvd: number, cvdChange: number): { text: string; color: string; detail: string } => {
  if (cvd > 1000000) {
    return { 
      text: "Сильный приток покупателей", 
      color: "text-emerald-500",
      detail: "агрессивные покупки - бычий импульс"
    }
  }
  if (cvd > 0) {
    return { 
      text: "Покупатели доминируют", 
      color: "text-emerald-500",
      detail: "преобладание market buy ордеров"
    }
  }
  if (cvd < -1000000) {
    return { 
      text: "Сильный приток продавцов", 
      color: "text-red-500",
      detail: "агрессивные продажи - медвежий импульс"
    }
  }
  if (cvd < 0) {
    return { 
      text: "Продавцы доминируют", 
      color: "text-red-500",
      detail: "преобладание market sell ордеров"
    }
  }
  return { 
    text: "Нейтрально", 
    color: "text-amber-500",
    detail: "баланс между покупателями и продавцами"
  }
}

export const getExchangeFlowInterpretation = (flow: number, timeframe: string): { text: string; trend: "up" | "down"; detail: string } => {
  const tfLabel = timeframe === "15" ? "скальп" : timeframe === "60" ? "внутри дня" : timeframe === "240" ? "свинг" : "позиция"
  
  if (flow < -500) {
    return { 
      text: "Сильный отток (Бычий)", 
      trend: "up",
      detail: `сильная аккумуляция для ${tfLabel} сделок`
    }
  }
  if (flow < 0) {
    return { 
      text: "Отток (Бычий)", 
      trend: "up",
      detail: `накапливается дефицит - ${tfLabel} лонги выгодны`
    }
  }
  if (flow > 500) {
    return { 
      text: "Сильный приток (Медвежий)", 
      trend: "down",
      detail: `фиксация прибыли для ${tfLabel} - осторожно`
    }
  }
  if (flow > 0) {
    return { 
      text: "Приток (Медвежий)", 
      trend: "down",
      detail: `давление продавцов для ${tfLabel} сделок`
    }
  }
  return { 
    text: "Нейтрально", 
    trend: "up",
    detail: "нет значительной активности потоков"
  }
}
