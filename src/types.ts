export interface Card {
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

export interface ApiResponse extends Array<Card> {}
