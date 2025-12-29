import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Typography,
  Divider,
  ClickAwayListener,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search,
  History,
  TrendingUp,
  Public,
  School,
  Newspaper,
  Clear,
} from '@mui/icons-material';
import { searchApi } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  relevanceScore: number;
}

interface SearchResponse {
  results?: SearchResult[];
  answer?: string;
}

interface SearchBarProps {
  onSearch?: (query: string, results: SearchResponse) => void;
  placeholder?: string;
  showTypeSelector?: boolean;
  defaultSearchType?: 'web' | 'academic' | 'news';
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Buscar en internet...',
  showTypeSelector = true,
  defaultSearchType = 'web',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchType, setSearchType] = useState(defaultSearchType);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await searchApi.autocomplete(debouncedQuery);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setShowResults(true);

    try {
      const response = await searchApi.search({
        query: searchQuery,
        searchType,
        maxResults: 10,
        language: 'es',
        includeAnswers: true,
      });

      setResults(response.data.results || []);
      setAnswer(response.data.answer || '');

      // Save to recent searches
      const updated = [searchQuery, ...recentSearches.filter((s: string) => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));

      if (onSearch) {
        onSearch(searchQuery, response.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setAnswer('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const getSearchTypeIcon = () => {
    switch (searchType) {
      case 'academic':
        return <School />;
      case 'news':
        return <Newspaper />;
      default:
        return <Public />;
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setShowResults(false)}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <TextField
          fullWidth
          inputRef={inputRef}
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <Search />}
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {query && (
                  <IconButton size="small" onClick={handleClear}>
                    <Clear fontSize="small" />
                  </IconButton>
                )}
                {showTypeSelector && (
                  <Tooltip title={`Tipo: ${searchType}`}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const types: ('web' | 'academic' | 'news')[] = ['web', 'academic', 'news'];
                        const currentIndex = types.indexOf(searchType);
                        setSearchType(types[(currentIndex + 1) % types.length]);
                      }}
                    >
                      {getSearchTypeIcon()}
                    </IconButton>
                  </Tooltip>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'background.paper',
            },
          }}
        />

        {showResults && (query || recentSearches.length > 0) && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 1,
              maxHeight: 500,
              overflow: 'auto',
              zIndex: 1000,
              borderRadius: 2,
            }}
          >
            {/* Search type chips */}
            {showTypeSelector && (
              <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
                {[
                  { type: 'web', label: 'Web', icon: <Public fontSize="small" /> },
                  { type: 'academic', label: 'Académico', icon: <School fontSize="small" /> },
                  { type: 'news', label: 'Noticias', icon: <Newspaper fontSize="small" /> },
                ].map(({ type, label, icon }) => (
                  <Chip
                    key={type}
                    icon={icon}
                    label={label}
                    size="small"
                    variant={searchType === type ? 'filled' : 'outlined'}
                    color={searchType === type ? 'primary' : 'default'}
                    onClick={() => setSearchType(type as 'web' | 'academic' | 'news')}
                  />
                ))}
              </Box>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <>
                <List dense>
                  {suggestions.map((suggestion: string, index: number) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                    >
                      <ListItemIcon>
                        <TrendingUp fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}

            {/* Recent searches */}
            {!query && recentSearches.length > 0 && (
              <>
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Búsquedas recientes
                </Typography>
                <List dense>
                  {recentSearches.map((search: string, index: number) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                    >
                      <ListItemIcon>
                        <History fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary={search} />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}

            {/* AI Answer */}
            {answer && (
              <Box sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Respuesta IA
                </Typography>
                <Typography variant="body2">{answer}</Typography>
              </Box>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <List>
                {results.map((result: SearchResult, index: number) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => window.open(result.url, '_blank')}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                      }}
                    >
                      {result.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="success.main"
                      sx={{ mb: 0.5 }}
                    >
                      {result.source}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {result.snippet}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            )}

            {loading && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Buscando...
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default SearchBar;
