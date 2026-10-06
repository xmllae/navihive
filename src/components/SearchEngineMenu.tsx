import { Menu, MenuItem, ListItemIcon, ListItemText, Avatar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import { SEARCH_ENGINES, type SearchEngine } from '../config/searchEngines';
export default function SearchEngineMenu({
  anchorEl,
  handleEngineMenuClose,
  handleEngineSelect,
  selectedEngine,
}: {
  anchorEl: HTMLElement | null;
  handleEngineMenuClose: () => void;
  handleEngineSelect: (engine: SearchEngine) => void;
  selectedEngine: SearchEngine;
}) {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleEngineMenuClose}>
      {SEARCH_ENGINES.map((engine) => (
        <MenuItem
          key={engine.key}
          onClick={() => handleEngineSelect(engine)}
          selected={engine.key === selectedEngine.key}
        >
          <ListItemIcon>
            {engine.icon ? (
              <Avatar src={engine.icon} sx={{ width: 24, height: 24 }} alt={engine.name} />
            ) : (
              <SearchIcon fontSize='small' />
            )}
          </ListItemIcon>
          <ListItemText>{engine.name}</ListItemText>
          {engine.key === selectedEngine.key && <CheckIcon fontSize='small' color='primary' />}
        </MenuItem>
      ))}
    </Menu>
  );
}
