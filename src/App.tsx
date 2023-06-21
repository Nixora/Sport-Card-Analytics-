import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import { TradingCard, ApiResponse } from './types';
import { groupByCardName } from './cardUtils';
import { Card, Grid, CardContent, Typography, Backdrop, CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';
import AppBarComponent from './AppBarComponent';
import { CSVLink } from 'react-csv';
import * as xlsx from 'xlsx';

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

  const handleDownload = (format: string) => {
    if (format === 'json') {
      const jsonData = JSON.stringify(groupedCards);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'groupedCards.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvData = groupedCards.map(group => ({
        'Card Name': group.cardName,
        'Average Price': group.averagePrice.toFixed(2),
        'Lower Bound': group.lowerBound.toFixed(2),
        'Upper Bound': group.upperBound.toFixed(2),
        'Standard Deviation': group.standardDeviation.toFixed(2),
        'Peak Price': group.peakPrice.toFixed(2),
        'Peak Day': group.peakDay
      }));
      const headers = Object.keys(csvData[0]);
      const csv = [headers, ...csvData].map(row => headers.map(fieldName => row[fieldName]));
      const csvContent = csv.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'groupedCards.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      const workbook = xlsx.utils.book_new();
      const sheetData = groupedCards.map(group => ({
        'Card Name': group.cardName,
        'Average Price': group.averagePrice.toFixed(2),
        'Lower Bound': group.lowerBound.toFixed(2),
        'Upper Bound': group.upperBound.toFixed(2),
        'Standard Deviation': group.standardDeviation.toFixed(2),
        'Peak Price': group.peakPrice.toFixed(2),
        'Peak Day': group.peakDay
      }));
      const worksheet = xlsx.utils.json_to_sheet(sheetData);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'groupedCards');
      const xlsxBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'groupedCards.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    }
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
      <AppBarComponent darkMode={darkMode} toggleDarkMode={toggleDarkMode} handleDownload={handleDownload} />
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
