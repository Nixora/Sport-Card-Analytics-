import { Card, TransformedCard } from "./types";

export function groupByCardName(cards: Card[]): TransformedCard[] {
  const groupedCards: Record<string, Card[]> = {};

  cards.forEach((card) => {
    if (groupedCards.hasOwnProperty(card.cardName)) {
      groupedCards[card.cardName].push(card);
    } else {
      groupedCards[card.cardName] = [card];
    }
  });

  const groupedData = Object.values(groupedCards).map((group) => {
    const cardName = group[0].cardName;
    const prices = group.map((card) => parsePrice(card.price));
    const averagePrice = calculateAverage(prices);
    const lowerBound = calculateLowerBound(prices);
    const upperBound = calculateUpperBound(prices);
    const standardDeviation = calculateStandardDeviation(prices);
    const { peakPrice, peakDay } = findPeakPriceAndDay(group);
    return {
      cardName,
      averagePrice,
      lowerBound,
      upperBound,
      standardDeviation,
      peakPrice,
      peakDay,
    };
  });

  return groupedData;
}

function calculateAverage(prices: number[]): number {
  const sum = prices.reduce((acc, price) => acc + price, 0);
  return sum / prices.length;
}

function calculateLowerBound(prices: number[]): number {
  return Math.min(...prices);
}

function calculateUpperBound(prices: number[]): number {
  return Math.max(...prices);
}

function calculateStandardDeviation(prices: number[]): number {
  const avg = calculateAverage(prices);
  const squaredDifferences = prices.map((price) => Math.pow(price - avg, 2));
  const sumSquaredDiff = squaredDifferences.reduce(
    (acc, diff) => acc + diff,
    0
  );
  const variance = sumSquaredDiff / prices.length;
  return Math.sqrt(variance);
}

function findPeakPriceAndDay(cards: Card[]): {
  peakPrice: number;
  peakDay: string;
} {
  let peakPrice = -Infinity;
  let peakDay = "";

  cards.forEach((card) => {
    const price = parsePrice(card.price);
    if (price > peakPrice) {
      peakPrice = price;
      peakDay = card.txnDate;
    }
  });

  return { peakPrice, peakDay };
}

function parsePrice(price: string): number {
  const numericString = price.replace(/[^0-9.]/g, "");
  return parseFloat(numericString);
}
