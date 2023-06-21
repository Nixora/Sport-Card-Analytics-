import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import { TradingCard, ApiResponse } from './types';
import { groupByCardName } from './cardUtils';
import { Card, Grid, CardContent, Typography, Button, Backdrop, CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';
import AppBarComponent from './AppBarComponent';

function App() {
  const [data, setData] = useState<TradingCard[] | null>(null);
  const [groupedCards, setGroupedCards] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);

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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  if (!data) {
    return (
      <Backdrop open>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <AppBarComponent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <div className={`app ${darkMode ? 'dark' : ''}`}>
        <Grid container spacing={2}>
          {groupedCards.map((group) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={group.cardName}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {group.cardName}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Average Price: ${group.averagePrice.toFixed(2)}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Lower Bound: ${group.lowerBound.toFixed(2)}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Upper Bound: ${group.upperBound.toFixed(2)}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Standard Deviation: {group.standardDeviation.toFixed(2)}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Peak Price: ${group.peakPrice.toFixed(2)}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Peak Day: {group.peakDay}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </div>
    </ThemeProvider>
  );
}

export default App;
