import React from 'react';
import { AppBar, Toolbar, Typography, Switch, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

interface AppBarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const CustomAppBar: React.FC<AppBarProps> = ({ darkMode, toggleDarkMode }) => {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: darkMode ?  '#c09c74' : '#302c2c' ,
        color: darkMode ?   'black' : 'white'
      }}
    >
      <Toolbar>
        <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
        MAGPIE Trading Cards
        </Typography>
        <WbSunnyIcon sx={{ marginRight: "8px" }} />
        <Switch checked={darkMode} onChange={toggleDarkMode} color="default" />
        <Brightness4Icon sx={{ marginLeft: "8px" }} />
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;
