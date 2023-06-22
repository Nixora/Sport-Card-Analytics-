import React from 'react';
import { CircularProgress } from '@mui/material';

const LoadingSpinner = () => (
  <div className="loading">
    <CircularProgress color="inherit" />
  </div>
);

export default LoadingSpinner;