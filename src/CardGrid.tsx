import React from 'react';
import { Card, Grid, CardContent, Typography } from '@mui/material';
import {
  Equalizer as EqualizerIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  GraphicEq as GraphicEqIcon,
  VerticalAlignTop as VerticalAlignTopIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { CardGridProps } from './types';

const CardGrid: React.FC<CardGridProps> = ({ groupedData }) => {
  return (
    <Grid container spacing={2} sx={{ marginTop: '1em', marginBottom: '2em', paddingLeft: '2em', paddingRight : '2em'}}>
      {groupedData.map((group) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={group.cardName}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ fontFamily: 'Neometric' }}>
                {group.cardName}
              </Typography>
              {[
                { icon: <EqualizerIcon />, label: 'Average Price', value: group.averagePrice },
                { icon: <TrendingDownIcon />, label: 'Lower Bound', value: group.lowerBound },
                { icon: <TrendingUpIcon />, label: 'Upper Bound', value: group.upperBound },
                { icon: <GraphicEqIcon />, label: 'Standard Deviation', value: group.standardDeviation },
                { icon: <VerticalAlignTopIcon />, label: 'Peak Price', value: group.peakPrice },
                { icon: <CalendarTodayIcon />, label: 'Peak Day', value: group.peakDay },
              ].map(({ icon, label, value }) => (
                <Typography
                  key={label}
                  variant="body1"
                  color="textSecondary"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {icon}&nbsp;
                  {label}:&nbsp;
                  <span style={{ fontWeight: 300 }}>
                    {typeof value === 'number'
                      ? `$${ value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`
                      
                      : value}
                  </span>
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default CardGrid;
