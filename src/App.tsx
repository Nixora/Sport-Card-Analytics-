import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import { Card, ApiResponse } from './types';

function App() {
  const [data, setData] = useState<Card[] | null>(null);

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

  if (!data) {
    return <div>Loading...</div>; 
  }

  return (
    <div>
      {/* Render your components or use the data */}
    </div>
  );
}

export default App;
