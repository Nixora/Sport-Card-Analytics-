export interface Card {
  cardName: string;
  gradingCompany: string;
  grade: number;
  txnDate: string;
  pricingSource: string;
  price: string;
}

export interface ApiResponse extends Array<Card> {}
