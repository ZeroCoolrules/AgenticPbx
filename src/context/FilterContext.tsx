import React, { createContext, useContext, useState, useMemo } from 'react';
import { DateRangePreset, GlobalFilterState } from '../lib/filters.ts';

interface FilterContextType {
  filters: GlobalFilterState;
  dateRange: DateRangePreset;
  agentId: string;
  leadStatus: string;
  searchQuery: string;
  setDateRange: (range: DateRangePreset) => void;
  setAgentId: (id: string) => void;
  setLeadStatus: (status: string) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  isFiltered: boolean;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [agentId, setAgentId] = useState<string>('all');
  const [leadStatus, setLeadStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateRange !== 'all') count++;
    if (agentId !== 'all') count++;
    if (leadStatus !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    return count;
  }, [dateRange, agentId, leadStatus, searchQuery]);

  const isFiltered = activeFilterCount > 0;

  const resetFilters = () => {
    setDateRange('all');
    setAgentId('all');
    setLeadStatus('all');
    setSearchQuery('');
  };

  const filters: GlobalFilterState = useMemo(() => ({
    dateRange,
    agentId,
    leadStatus,
    searchQuery,
  }), [dateRange, agentId, leadStatus, searchQuery]);

  return (
    <FilterContext.Provider
      value={{
        filters,
        dateRange,
        agentId,
        leadStatus,
        searchQuery,
        setDateRange,
        setAgentId,
        setLeadStatus,
        setSearchQuery,
        resetFilters,
        isFiltered,
        activeFilterCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
