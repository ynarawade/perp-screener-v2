import { useQuery } from "@tanstack/react-query";

import { getScreenerResults } from "../api/screener";

export function useScreener() {
  return useQuery({
    queryKey: ["screener"],
    queryFn: getScreenerResults,

    refetchInterval: 1_000,

    staleTime: 0,

    refetchOnWindowFocus: true,
  });
}
