import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import { TradingCard, ApiResponse } from './types';
import { groupByCardName } from './cardUtils';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';
import AppBarComponent from './AppBar';
import { handleDownload } from './downloadUtils';
import debounce from 'lodash/debounce';
import CardGrid from './CardGrid';
import LoadingSpinner from './LoadingSpinner';

function App() {
  const [data, setData] = useState<TradingCard[] | null>(null);
  const [groupedCards, setGroupedCards] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  const fetchData = debounce(async () => {
    try {
      const response: AxiosResponse<ApiResponse> = await axios.get(
        'https://mocki.io/v1/70f45519-0232-463b-bd4f-88e9d7213d26'
      );
      setData(response.data);
    } catch (error) {
      console.log('Error fetching data:', error);
    }
  }, 500);

  useEffect(() => {
    fetchData();

    return () => {
      fetchData.cancel();
    };
  }, []);

  useEffect(() => {
    if (data) {
      const groupedData = groupByCardName(data);
      setGroupedCards(groupedData);
    }
  }, [data]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  const handleDownloadClick = (format: string) => {
    handleDownload(format, groupedCards);
  };

  if (!data) {
    return <LoadingSpinner />;
  }

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <AppBarComponent darkMode={darkMode} toggleDarkMode={toggleDarkMode} handleDownload={handleDownloadClick} />
      <CardGrid groupedData={groupedCards} />
    </ThemeProvider>
  );
}

export default App;
