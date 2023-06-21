import React from 'react';
import { Card, Grid, CardContent, Typography } from '@mui/material';
import { TransformedCard, CardGridProps } from './types';

const CardGrid: React.FC<CardGridProps> = ({ groupedData }) => {
  return (
    <div className="app">
      <Grid container spacing={2}>
        {groupedData.map((group) => (
          <React.Fragment key={group.cardName}>
            <Grid item xs={12} sm={6} md={4} lg={3}>
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
          </React.Fragment>
        ))}
      </Grid>
    </div>
  );
};

export default CardGrid;
