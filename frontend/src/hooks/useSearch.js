import { useState, useEffect } from 'react';
import api from '../api';

const useSearch = (searchTerm) => {
    const [results, setResults] = useState({ communities: [], users: [], posts: [] });
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm && searchTerm.trim().length > 0) {
                setIsSearching(true);
                try {
                    const res = await api.get(`/api/search?q=${searchTerm}`);
                    setResults(res.data);
                } catch (err) {
                    console.error("Search error in useSearch hook:", err);
                    setResults({ communities: [], users: [], posts: [] });
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResults({ communities: [], users: [], posts: [] });
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    return { results, isSearching };
};

export default useSearch;
