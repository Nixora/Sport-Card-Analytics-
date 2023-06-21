import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import { Card, ApiResponse } from './types';
import { groupByCardName } from './cardUtils';

function App() {
  const [data, setData] = useState<Card[] | null>(null);
  const [groupedCards, setGroupedCards] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response: AxiosResponse<ApiResponse> = await axios.get('https://mocki.io/v1/70f45519-0232-463b-bd4f-88e9d7213d26');
        setData(response.data);
      } catch (error) {
        console.log('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data) {
      const groupedData = groupByCardName(data);
      setGroupedCards(groupedData);
    }
  }, [data]);

  if (!data) {
    return <div>Loading...</div>; // or display a loading indicator
  }
console.log(groupedCards)

  return (
    <div>

    </div>
  );
}

export default App;
