import React from 'react';
import { AppBar, Toolbar, Typography, Switch, IconButton, Menu, MenuItem } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import { SaveAlt as SaveAltIcon } from '@mui/icons-material';

interface AppBarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  handleDownload: (format: string) => void;
}

const CustomAppBar: React.FC<AppBarProps> = ({ darkMode, toggleDarkMode, handleDownload }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadOption = (format: string) => {
    handleDownload(format);
    handleClose();
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: darkMode ? '#c09c74' : '#302c2c',
        color: darkMode ? 'black' : 'white',
      }}
    >
      <Toolbar>
        <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontFamily: 'Neometric, sans-serif' }}>
          <span style={{ marginRight: '8px' }}>MAGPIE Trading Cards</span>
          <IconButton
            color="inherit"
            onClick={handleClick}
            aria-controls="download-menu"
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <SaveAltIcon />
          </IconButton>
          <Menu
            id="download-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'download-button',
            }}
          >
            <MenuItem onClick={() => handleDownloadOption('json')}>Download as JSON</MenuItem>
            <MenuItem onClick={() => handleDownloadOption('csv')}>Download as CSV</MenuItem>
            <MenuItem onClick={() => handleDownloadOption('xlsx')}>Download as XLSX</MenuItem>
          </Menu>
        </Typography>
        <WbSunnyIcon sx={{ marginRight: '8px' }} />
        <Switch checked={darkMode} onChange={toggleDarkMode} color="default" />
        <Brightness4Icon sx={{ marginLeft: '8px' }} />
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;
