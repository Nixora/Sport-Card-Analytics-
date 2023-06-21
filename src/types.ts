export interface TradingCard {
  cardName: string;
  gradingCompany: string;
  grade: number;
  txnDate: string;
  pricingSource: string;
  price: string;
}

export interface TransformedCard {
  cardName: string;
  averagePrice: number;
  lowerBound: number;
  upperBound: number;
  standardDeviation: number;
  peakPrice: number;
  peakDay: string;
}

export interface CardGridProps {
  groupedData: TransformedCard[];
}

export interface ApiResponse extends Array<TradingCard> {}
